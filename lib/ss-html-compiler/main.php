<?php
error_reporting(E_ALL|E_STRICT);

if (count($argv) !== 5) {
    print_help();
    exit;
}
$build_type = HtmlCompiler::toBuildType($argv[1]);
$src_html   = $argv[2];
$res_dir    = $argv[3];
$dst_dir    = $argv[4];

$hc = new HtmlCompiler();
$hc->process($build_type,$src_html,$res_dir,$dst_dir);
exit;

/**
 * コマンドライン上での本コマンドの使い方
 */
function print_help()
{
    echo <<<USAGE
[ss-html-compiler]
Usage: php lib/ss-html-compiler/main.php <build_type> <src_html> <res_dir> <dst_dir>
    build_type: debug | release
USAGE;
}

/**
 * HtmlCompiler
 * HTMLアプリケーションが利用するJavaScript/CSSを
 * 圧縮し埋め込みもしくは外部リンク化する。
 */
class HtmlCompiler
{
    const JAR_CLOSURE = "lib\\closure-compiler\\compiler.jar";
    const JAR_YUICOMPRESSOR = "lib\\yuicompressor\\yuicompressor-2.4.2.jar";
    const DEBUG = 0;
    const RELEASE = 1;
    private $build_type;
    private $sources;
    private $res_dir;
    private $dst_dir;

    public function process($build_type,$src_html,$res_dir,$dst_dir)
    {
        $this->build_type = $build_type;
        $this->sources = array();
        $this->res_dir = $res_dir;
        $this->dst_dir = $dst_dir;
        $dst_html = $dst_dir.DIRECTORY_SEPARATOR.self::filename($src_html);

        $html = $this->load($src_html);
        $html = $this->compact_html($html);
        $html = $this->process_include($html);
        $this->log("Save html:$dst_html");
        file_put_contents($dst_html,$html);
        $this->copy_resources($res_dir,$dst_dir);
        $this->copy_sources();
    }

    private function copy_sources()
    {
        foreach($this->sources as $path => $filename) {
            $this->copy_file($path,$this->dst_dir.'/'.$filename);
        }
    }

    private function copy_resources($src_dir,$dst_dir)
    {
        if (!is_dir($src_dir)) {
            throw new Exception("src_dir('$src_dir') isn't a directory.");
        }
        if (!is_dir($dst_dir)) {
            throw new Exception("dst_dir('$dst_dir') isn't a directory.");
        }
        if (($dh = opendir($src_dir)) === false) {
            throw new Exception("Can't open src_dir('$src_dir').");
        }
        while (($file = readdir($dh)) !== false) {
            if (strncmp($file,'.',1) !== false || is_dir($src_dir.'/'.$file)) {
                continue;
            }
            $this->copy_file($src_dir.'/'.$file,$dst_dir.'/'.$file);
        }
        closedir($dh);
    }

    private function copy_file($src,$dst)
    {
        $this->log("Copy: '$src' => '$dst'");
        $b = copy($src,$dst);
        $this->log("Result:$b");
        if (!$b) {
            throw new Exception("Can't copy file from '$src' to '$dst'.");
        }
    }

    private function process_include($html)
    {
        $p_js  = '/<include\\s+type="javascript"'.
                 '\\s+src_interns="([A-Za-z0-9._\\-\\/,]+)"'.
                 '\\s+src_externs="([A-Za-z0-9._\\-\\/,\\:]+)"\\s*\\/>/';
        $p_css = '/<include\\s+type="css"\\s+src="([A-Za-z0-9._\\-\\/,]+)"\\s*\\/>/';
        $html = preg_replace_callback($p_js, array($this,'on_matched_javascript'),$html,-1,$count_js);
        $html = preg_replace_callback($p_css,array($this,'on_matched_cs'),$html,-1,$count_css);
        $this->log("Processed javascript incllude tag: $count_js");
        $this->log("Processed css incllude tag: $count_css");
        return $html;
    }

    /**
     * compilation_level = SIMPLE_OPTIMIZATIONS ADVANCED_OPTIMIZATIONS WHITESPACE_ONLY
     */
    private function on_matched_javascript($match)
    {
        $src_interns = split(',',$match[1]);
        $src_externs = split(',',$match[2]);
        $html = '';
        if ($this->build_type === self::DEBUG) {
            foreach($src_externs as $src) {
                list($master,$extern) = split(':',$src);
                $filename = self::filename($master);
                $this->sources[$master] = $filename;
                $html .= "<script language=\"JavaScript\" type=\"text/javascript\" src=\"$filename\"></script>\n";
            }
            foreach($src_interns as $src) {
                $filename = self::filename($src);
                $this->sources[$src] = $filename;
                $html .= "<script language=\"JavaScript\" type=\"text/javascript\" src=\"$filename\"></script>\n";
            }
            return $html;
        } else {
            $opt_js = '';
            foreach($src_interns as $src) {
                $opt_js .= "--js $src ";
            }
            $js     = '';
            $opt_ex = '';
            foreach($src_externs as $src) {
                list($master,$extern) = split(':',$src);
                $js     .= $this->load($master)."\n";
                $opt_ex .= "--externs $extern ";
            }

            $tmp = tempnam(sys_get_temp_dir(),'shc');
            $jar = self::JAR_CLOSURE;
            $cmd= "java -jar $jar $opt_js $opt_ex ".
                  " --logging_level 1 ".
                  " --compilation_level ADVANCED_OPTIMIZATIONS ".
                  " --js_output_file $tmp";
            $this->cmd($cmd);
            $js .= $this->load($tmp) ."\n";
            unlink($tmp);
            return"<script language=\"JavaScript\" type=\"text/javascript\" >$js</script>";
        }
    }

    private function on_matched_cs($match)
    {
        $src = $match[1];
        $filename = self::filename($src);
        if ($this->build_type === self::DEBUG) {
            $this->sources[$src] = $filename;
            return "<link href=\"$filename\" rel=\"stylesheet\" type=\"text/css\" />";
        } else {
            $css = $this->load_compact_css($src);
            return"<style type=\"text/css\">$css</style>";
        }
    }

    private function load_compact_css($src)
    {
        $tmp = tempnam(sys_get_temp_dir(),'shc');
        $jar = self::JAR_YUICOMPRESSOR;
        $cmd = "java -jar $jar $src -o $tmp";
        $this->cmd($cmd);
        $css = $this->load($tmp);
        unlink($tmp);
        return $css;
    }

    private function load($src)
    {
        $this->log("File load:'$src'");
        $f = file_get_contents($src);
        if (!$f) { throw new Exception("Can't load file: $src"); }
        return $f;
    }

    private function compact_html($html)
    {
        if ($this->build_type === self::DEBUG) {
            $this->log("Skip to compact html");
            return $html;
        } else {
            $before = strlen($html);
            $html = preg_replace('/\t|\r|\n/',' ',$html);
            $html = preg_replace('/\s+/',' ',$html);
            $html = preg_replace('/> </','><',$html);
            $after = strlen($html);
            $this->log("Compacted html: $before => $after bytes.");
            return $html;
        }
    }

    private static function filename($path)
    {
        $path = str_replace('\\','/',$path);
        $last = strrpos($path,'/');
        if ($last === false) {
            $filename = $path;
        } else {
            $filename = substr($path,$last+1);
        }
        return $filename;
    }

    public static function toBuildType($string)
    {
        return $string == 'release' ? self::RELEASE : self::DEBUG;
    }

    private function cmd($cmd)
    {
        $this->log("> $cmd");
        $r = exec($cmd);
        $this->log("Result:$r");
        return $r;
    }

    private function log($msg)
    {
        echo $msg,"\n";
    }
}
