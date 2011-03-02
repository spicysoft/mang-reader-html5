php lib\ss-html-compiler\main.php debug   src\main\js\ja_pc.html src\main\resources target\dist-debug
copy src\main\resources\* target\dist-debug\

php lib\ss-html-compiler\main.php release src\main\js\ja_pc.html src\main\resources target\dist-release
copy src\main\resources\* target\dist-release\

copy target\dist-release\* ..\mang\web_user\app\webroot\files\viewer\html5\