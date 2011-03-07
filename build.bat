@echo off
echo ////////////////////////////////////////
echo   Building ** DEBUG ** package.
echo ////////////////////////////////////////
echo;
php lib\ss-html-compiler\main.php debug   src\main\js\ja_pc.html src\main\resources target\dist-debug
copy src\main\resources\* target\dist-debug\

echo;
echo;
echo;
echo ////////////////////////////////////////
echo   Building ** RELEASE ** package.
echo ////////////////////////////////////////
echo;
php lib\ss-html-compiler\main.php release src\main\js\ja_pc.html src\main\resources target\dist-release
copy src\main\resources\* target\dist-release\

echo;
echo;
echo;
echo ////////////////////////////////////////
echo   All builds Finished.
echo ////////////////////////////////////////
echo;

set /p INP="Do you copy release packages to mang [Y/n]"
if "%INP%" == "Y" goto INP_Y

:INP_N
echo Release packages *** ARE NOT *** copied to mang.
goto EXIT_BAT

:INP_Y
copy target\dist-release\* ..\mang\web_user\app\webroot\files\viewer\html5\
goto EXIT_BAT


:EXIT_BAT
