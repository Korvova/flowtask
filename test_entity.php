<?php
require($_SERVER["DOCUMENT_ROOT"] . "/bitrix/modules/main/include/prolog_before.php");
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Тест Entity</title>
    <script src="//api.bitrix24.com/api/v1/"></script>
</head>
<body>
    <h1>Тест Entity</h1>
    <div id="result"></div>

    <script>
        BX24.init(function() {
            console.log('Тестируем entity...');
            
            // Получаем список всех entity
            BX24.callMethod('entity.get', {}, function(result) {
                if (result.error()) {
                    console.error('Ошибка:', result.error());
                    document.getElementById('result').innerHTML = 'Ошибка: ' + JSON.stringify(result.error());
                } else {
                    const entities = result.data();
                    console.log('Найдено entities:', entities);
                    
                    let html = '<h2>Найдено Entity:</h2><ul>';
                    entities.forEach(entity => {
                        html += '<li><strong>' + entity.ENTITY + '</strong> - ' + entity.NAME + '</li>';
                    });
                    html += '</ul>';
                    
                    document.getElementById('result').innerHTML = html;
                }
            });
        });
    </script>
</body>
</html>
<?php
\CMain::FinalActions();
?>
