<?php
// Проверка зарегистрированных событий
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Проверка событий</title>
    <script src="//api.bitrix24.com/api/v1/"></script>
</head>
<body>
    <h1>Проверка зарегистрированных событий</h1>
    <button onclick="checkEvents()">Проверить события</button>
    <pre id="result"></pre>

    <script>
        function checkEvents() {
            BX24.init(() => {
                BX24.callMethod('event.get', {}, (result) => {
                    if (result.error()) {
                        document.getElementById('result').textContent = 'Ошибка: ' + JSON.stringify(result.error(), null, 2);
                    } else {
                        document.getElementById('result').textContent = JSON.stringify(result.data(), null, 2);
                    }
                });
            });
        }
    </script>
</body>
</html>
