<?php

use Illuminate\Support\Facades\Route;

Route::get('/rich-editor-demo', function () {
    return view('workbench::rich-editor-demo');
});

Route::get('/', function () {
    return view('welcome');
});
