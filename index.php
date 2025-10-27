<?php
/**
 * Telegsarflow - главная страница приложения
 * Точка входа для пользователей
 */
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Telegsarflow - Процессы для задач</title>
    <script src="//api.bitrix24.com/api/v1/"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            padding: 60px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 800px;
            width: 100%;
            text-align: center;
        }
        h1 {
            font-size: 48px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 20px;
        }
        .subtitle {
            font-size: 20px;
            color: #666;
            margin-bottom: 40px;
        }
        .features {
            text-align: left;
            background: #f8f9fa;
            padding: 30px;
            border-radius: 15px;
            margin: 30px 0;
        }
        .features h3 {
            color: #667eea;
            margin-bottom: 20px;
        }
        .features ul {
            list-style: none;
        }
        .features li {
            padding: 10px 0;
            font-size: 18px;
            color: #333;
        }
        .features li:before {
            content: "✓ ";
            color: #667eea;
            font-weight: bold;
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Telegsarflow</h1>
        <div class="subtitle">Управление процессами в задачах Битрикс24</div>

        <div class="features">
            <h3>Возможности:</h3>
            <ul>
                <li>Визуальный редактор процессов с drag & drop</li>
                <li>Автоматическое создание связанных задач</li>
                <li>Настройка триггеров и условий выполнения</li>
                <li>История выполнения процессов</li>
            </ul>
        </div>

        <p style="color: #666;">
            Откройте любую задачу и найдите вкладку <strong>"Процессы"</strong>
        </p>
    </div>

    <script>
        BX24.init(function(){
            // Подгоняем размер окна
            BX24.fitWindow();
        });
    </script>
</body>
</html>
