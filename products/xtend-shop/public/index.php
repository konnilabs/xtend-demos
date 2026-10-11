<?php
define('LARAVEL_START', microtime(true));
// Composer eagerly loads this runtime before Laravel can handle dependency errors.
$xtendRequiredAdapter = __DIR__.'/../vendor/ccslabs/xtend-laravel/runtime/rmt-php-app-service-adapter.php';
if (!is_file($xtendRequiredAdapter) || !is_readable($xtendRequiredAdapter)) {
    http_response_code(500);
    exit;
}
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->handleRequest(Illuminate\Http\Request::capture());
