<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Laravel Rich Editor Demo</title>

    @livewireStyles
</head>
<body style="font-family: system-ui, sans-serif; background: #f3f4f6; padding: 2rem;">

    <main style="max-width: 900px; margin: 0 auto;">
        <h1>Laravel Rich Editor</h1>

        <p>Workbench development preview</p>

        <livewire:laravel-rich-editor
            value=""
            placeholder="Write something amazing..."
            :min-height="300"
        />
    </main>

    @livewireScripts
</body>
</html>