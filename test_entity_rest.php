<?php
/**
 * Тест Entity через REST API
 */

// Получаем токен из GET параметров (передаётся автоматически при вызове из Bitrix24)
\$auth = isset(\$_REQUEST['auth']) ? \$_REQUEST['auth'] : null;

if (!\$auth) {
    die('No auth token provided. Open this file from Bitrix24 application context.');
}

\$accessToken = \$auth['access_token'];
\$domain = \$auth['domain'];

// Функция для вызова REST API
function callRestApi(\$domain, \$accessToken, \$method, \$params = []) {
    \$url = "https://{\$domain}/rest/{\$method}.json";
    
    \$params['auth'] = \$accessToken;
    
    \$ch = curl_init();
    curl_setopt(\$ch, CURLOPT_URL, \$url);
    curl_setopt(\$ch, CURLOPT_POST, 1);
    curl_setopt(\$ch, CURLOPT_POSTFIELDS, http_build_query(\$params));
    curl_setopt(\$ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt(\$ch, CURLOPT_SSL_VERIFYPEER, false);
    
    \$response = curl_exec(\$ch);
    \$httpCode = curl_getinfo(\$ch, CURLINFO_HTTP_CODE);
    curl_close(\$ch);
    
    return [
        'httpCode' => \$httpCode,
        'response' => json_decode(\$response, true)
    ];
}

// Получаем список всех entity
\$result = callRestApi(\$domain, \$accessToken, 'entity.get', []);

?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Тест Entity</title>
    <style>
        body { font-family: Arial; padding: 20px; }
        h1 { color: #333; }
        .entity { background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .error { background: #ffcccc; color: #cc0000; padding: 10px; border-radius: 5px; }
        .success { background: #ccffcc; color: #006600; padding: 10px; border-radius: 5px; }
        pre { background: #f5f5f5; padding: 10px; overflow: auto; }
    </style>
</head>
<body>
    <h1>📦 Тест Entity</h1>
    
    <?php if (\$result['httpCode'] == 200 && isset(\$result['response']['result'])): ?>
        <div class="success">✅ Успешно получен список Entity</div>
        
        <h2>Найдено Entity:</h2>
        <?php foreach (\$result['response']['result'] as \$entity): ?>
            <div class="entity">
                <strong>ENTITY:</strong> <?= htmlspecialchars(\$entity['ENTITY']) ?><br>
                <strong>NAME:</strong> <?= htmlspecialchars(\$entity['NAME']) ?>
            </div>
        <?php endforeach; ?>
        
        <h2>Полный ответ:</h2>
        <pre><?= print_r(\$result['response'], true) ?></pre>
    <?php else: ?>
        <div class="error">❌ Ошибка получения Entity</div>
        <pre><?= print_r(\$result, true) ?></pre>
    <?php endif; ?>
</body>
</html>
