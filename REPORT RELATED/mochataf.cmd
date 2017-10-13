@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\..\mocha\bin\mocha" %*
) ELSE (
  REM @SETLOCAL
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  REM @echo off

  echo %~dp0
  echo "---------------------------"
  REM DANISH
  node  "%~dp0\node_modules\@markit\test-automation-framework\mocha" %*

)