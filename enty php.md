Методы работы с элементами хранилища
Мы еще обновляем эту страницу

Тут может не хватать некоторых данных — дополним в ближайшее время

Scope: entity

Кто может выполнять метод: любой пользователь

Метод

Описание

entity.item.get

Получение списка элементов хранилища. Списочный метод.

entity.item.add

Добавление элемента хранилища.

entity.item.update

Обновление элемента хранилища.

entity.item.delete

Удаление элемента хранилища.




Обновить элемент хранилища entity.item.update
Мы еще обновляем эту страницу

Тут может не хватать некоторых данных — дополним в ближайшее время

Scope: entity

Кто может выполнять метод: любой пользователь

Метод entity.item.update обновляет элемент хранилища. Пользователь должен обладать хотя бы правами на запись (W) в хранилище.

Параметры
Параметр

Описание

ENTITY*
string

Обязательный. Строковой идентификатор хранилища.

ID*
integer

Обязательный. Идентификатор элемента.

NAME
string

Наименование элемента.

ACTIVE
unknown

Флаг активности элемента (Y|N).

DATE_ACTIVE_FROM
unknown

Дата начала активности элемента.

DATE_ACTIVE_TO
unknown

Дата окончания активности элемента.

SORT
unknown

Сортировочный вес элемента.

PREVIEW_PICTURE
unknown

Картинка анонса элемента.

PREVIEW_TEXT
unknown

Анонс элемента.

DETAIL_PICTURE
unknown

Детальная картинка элемента.

DETAIL_TEXT
unknown

Детальный текст элемента.

CODE
unknown

Символьный код элемента.

SECTION
unknown

Идентификатор раздела хранилища.

PROPERTY_VALUES*
unknown

Обязательный. ассоциативный список значений свойств элемента. Свойства хранилища создаются при помощи entity.item.property.add.

Обязательные параметры отмечены *

Примеры
try {
    $response = $b24Service
        ->core
        ->call(
            'entity.item.update',
            [
                'ENTITY'          => 'menu_new',
                'ID'              => 842,
                'DATE_ACTIVE_FROM' => new DateTime(),
                'DETAIL_PICTURE'  => '',
                'NAME'            => 'Goodbye Cruel World',
                'PROPERTY_VALUES' => [
                    'test'     => 11,
                    'test1'    => 22,
                    'test_file' => ''
                ],
                'SECTION'         => 219
            ]
        );

    $result = $response
        ->getResponseData()
        ->getResult();

    echo 'Success: ' . print_r($result, true);
    // Нужная вам логика обработки данных
    processData($result);

} catch (Throwable $e) {
    error_log($e->getMessage());
    echo 'Error updating entity item: ' . $e->getMessage();
}

Как использовать примеры в документации

Ответ в случае успеха
200 OK

{"result":true}


______________


Добавить элемент хранилища entity.item.add
Мы еще обновляем эту страницу

Тут может не хватать некоторых данных — дополним в ближайшее время

Scope: entity

Кто может выполнять метод: любой пользователь

Метод entity.item.add добавляет элемент хранилища. Пользователь должен обладать хотя бы правами на запись (W) в хранилище.

Параметры
Параметр

Описание

ENTITY*
string

Обязательный. Строковой идентификатор хранилища.

NAME*
string

Обязательный. Наименование элемента.

ACTIVE
unknown

Флаг активности элемента (Y|N).

DATE_ACTIVE_FROM
unknown

Дата начала активности элемента.

DATE_ACTIVE_TO
unknown

Дата окончания активности элемента.

SORT
unknown

Сортировочный вес элемента.

PREVIEW_PICTURE
unknown

Картинка анонса элемента.

PREVIEW_TEXT
unknown

Анонс элемента.

DETAIL_PICTURE
unknown

Детальная картинка элемента.

DETAIL_TEXT
unknown

Детальный текст элемента.

CODE
unknown

Символьный код элемента.

SECTION
unknown

Идентификатор раздела хранилища.

PROPERTY_VALUES
unknown

Ассоциативный список значений свойств элемента. Свойства хранилища создаются при помощи entity.item.property.add.

Обязательные параметры отмечены *

Пример
try {
    $response = $b24Service
        ->core
        ->call(
            'entity.item.add',
            [
                'ENTITY'          => 'menu_new',
                'DATE_ACTIVE_FROM' => new DateTime(),
                'DETAIL_PICTURE'  => '',
                'NAME'            => 'Hello, world!',
                'PROPERTY_VALUES' => [
                    'test'     => 11,
                    'test1'    => 22,
                    'test_file' => ''
                ],
                'SECTION'         => 219
            ]
        );

    $result = $response
        ->getResponseData()
        ->getResult();

    echo 'Success: ' . print_r($result, true);
    // Нужная вам логика обработки данных
    processData($result);

} catch (Throwable $e) {
    error_log($e->getMessage());
    echo 'Error adding entity item: ' . $e->getMessage();
}

Как использовать примеры в документации

Ответ в случае успеха
200 OK

{"result":842}


______________


Получить список элементов хранилища entity.item.get
Мы еще обновляем эту страницу

Тут может не хватать некоторых данных — дополним в ближайшее время

Scope: entity

Кто может выполнять метод: любой пользователь

Описание
Метод entity.item.get получает список элементов хранилища. Списочный метод.

Пользователь должен обладать хотя бы правами на чтение (R) хранилища.

Параметры
Параметр

Описание

ENTITY*

Обязательный. Строковой идентификатор хранилища.

SORT

Аналогичны параметрам arOrder и arFilter PHP-метода CIBlockElement::GetList (включая операции фильтра и сложную логику).

FILTER

Аналогичны параметрам arOrder и arFilter PHP-метода CIBlockElement::GetList (включая операции фильтра и сложную логику).

start

Порядковый номер элемента списка, начиная с которого необходимо возвращать следующие элементы при вызове текущего метода. Подробности в статье Особенности списочных методов

Обязательные параметры отмечены *

Примеры
try {
    $response = $b24Service
        ->core
        ->call(
            'entity.item.get',
            [
                'ENTITY' => 'menu',
                'SORT' => [
                    'DATE_ACTIVE_FROM' => 'ASC',
                    'ID' => 'ASC'
                ],
                'FILTER' => [
                    '>=DATE_ACTIVE_FROM' => $dateStart,
                    '<DATE_ACTIVE_FROM' => $dateFinish
                ]
            ]
        );

    $result = $response
        ->getResponseData()
        ->getResult();

    echo 'Success: ' . print_r($result, true);
    // Нужная вам логика обработки данных
    $this->buildData($result);

} catch (Throwable $e) {
    error_log($e->getMessage());
    echo 'Error getting entity items: ' . $e->getMessage();
}

Пример вызова со сложным фильтром
try {
    $response = $b24Service
        ->core
        ->call(
            'entity.item.get',
            [
                'ENTITY' => 'menu',
                'SORT' => [
                    'DATE_ACTIVE_FROM' => 'ASC',
                    'ID' => 'ASC'
                ],
                'FILTER' => [
                    '1' => [
                        'LOGIC' => 'OR',
                        'PROPERTY_MYPROP1' => 'value1',
                        'PROPERTY_MYPROP2' => 'value2'
                    ]
                ]
            ]
        );

    $result = $response
        ->getResponseData()
        ->getResult();

    echo 'Success: ' . print_r($result, true);
    // Нужная вам логика обработки данных
    processData($result);

} catch (Throwable $e) {
    error_log($e->getMessage());
    echo 'Error getting entity items: ' . $e->getMessage();
}

Как использовать примеры в документации

Ответ в случае успеха
200 OK

{
    "result":
    [
        {
            "ID":"838",
            "TIMESTAMP_X":"2013-06-25T15:06:47+03:00",
            "MODIFIED_BY":"1",
            "DATE_CREATE":"2013-06-25T15:06:47+03:00",
            "CREATED_BY":"1",
            "ACTIVE":"Y",
            "DATE_ACTIVE_FROM":"2013-07-01T03:00:00+03:00",
            "DATE_ACTIVE_TO":"",
            "SORT":"500",
            "NAME":"Гречка в мундире",
            "PREVIEW_PICTURE":null,
            "PREVIEW_TEXT":null,
            "DETAIL_PICTURE":null,
            "DETAIL_TEXT":null,
            "CODE":null,
            "ENTITY":"menu",
            "SECTION":null,
            "PROPERTY_VALUES":
            {
                "dish":"813",
                "price":"16"
            }
        }
    ],
    "total":1
}


Методы работы со свойствами элементов хранилища данных
Мы еще обновляем эту страницу

Тут может не хватать некоторых данных — дополним в ближайшее время

Scope: entity

Кто может выполнять метод: любой пользователь

Метод

Описание

entity.item.property.get

Получение списка дополнительных свойств элементов хранилища.

entity.item.property.add

Добавление дополнительного свойства элементов хранилища.

entity.item.property.update

Обновление дополнительного свойства элементов хранилища.

entity.item.property.delete

Удаление дополнительного свойства элементов хранилища.




Получить список дополнительных свойств элементов хранилища entity.item.property.get
Мы еще обновляем эту страницу

Тут может не хватать некоторых данных — дополним в ближайшее время

Scope: entity

Кто может выполнять метод: любой пользователь

Метод entity.item.property.get получает список дополнительных свойств элементов хранилища.

Параметры
Параметр

Описание

ENTITY*
string

Обязательный. Строковый идентификатор хранилища.

PROPERTY
string

Строковый идентификатор требуемого свойства.

Обязательные параметры отмечены *

Примеры
try {
    $response = $b24Service
        ->core
        ->call(
            'entity.item.property.get',
            [
                'ENTITY' => 'menu_new',
            ]
        );

    $result = $response
        ->getResponseData()
        ->getResult();

    echo 'Success: ' . print_r($result, true);
    // Нужная вам логика обработки данных
    processData($result);

} catch (Throwable $e) {
    error_log($e->getMessage());
    echo 'Error getting entity item properties: ' . $e->getMessage();
}

Как использовать примеры в документации

Ответ в случае успеха
200 OK

{
    "result":
    [
        {
            "PROPERTY":"test",
            "NAME":"Тестовое свойство",
            "TYPE":"S"
        },
        {
            "PROPERTY":"test1",
            "NAME":"Второе тестовое свойство",
            "TYPE":"N"
        },
        {
            "PROPERTY":"test_file",
            "NAME":"Файло",
            "TYPE":"F"
        }
    ]
}


Добавить дополнительное свойство элементов хранилища entity.item.property.add
Мы еще обновляем эту страницу

Тут может не хватать некоторых данных — дополним в ближайшее время

Scope: entity

Кто может выполнять метод: любой пользователь

Метод entity.item.property.add добавляет дополнительное свойство элементов хранилища. Пользователь должен обладать правами на управление (Х) хранилищем.

Параметры
Параметр

Описание

ENTITY*
string

Обязательный. Строковый идентификатор хранилища.

PROPERTY*
string

Обязательный. Строковый идентификатор свойства.

NAME*
string

Обязательный. Наименование свойства.

TYPE*
unknown

Обязательный. Тип свойства (S - строка, N - число, F - файл).

Обязательные параметры отмечены *

Примеры
try {
    $response = $b24Service
        ->core
        ->call(
            'entity.item.property.add',
            [
                'ENTITY'   => 'menu_new',
                'PROPERTY' => 'new_prop',
                'NAME'     => 'Новое свойство',
                'TYPE'     => 'S',
            ]
        );

    $result = $response
        ->getResponseData()
        ->getResult();

    echo 'Success: ' . print_r($result, true);
    // Нужная вам логика обработки данных
    processData($result);

} catch (Throwable $e) {
    error_log($e->getMessage());
    echo 'Error adding entity item property: ' . $e->getMessage();
}

Как использовать примеры в документации

Ответ в случае успеха
200 OK

{"result":true}


Изменить дополнительное свойство элементов хранилища entity.item.property.update
Мы еще обновляем эту страницу

Тут может не хватать некоторых данных — дополним в ближайшее время

Scope: entity

Кто может выполнять метод: любой пользователь

Метод entity.item.property.update обновляет дополнительное свойство элементов хранилища. Пользователь должен обладать правами на управление (Х) хранилищем.

Параметры
Параметр

Описание

ENTITY*
string

Обязательный. Строковый идентификатор хранилища.

PROPERTY*
string

Обязательный. Строковый идентификатор свойства.

PROPERTY_NEW
string

Новый строковый идентификатор свойства.

NAME
string

Наименование свойства.

TYPE
unknown

Тип свойства (S - строка, N - число, F - файл).

Обязательные параметры отмечены *

Пример
try
{
	const response = await $b24.callMethod(
		'entity.item.property.update',
		{
			ENTITY: 'menu_new',
			PROPERTY: 'new_prop',
			NAME: 'Уже не новое свойство'
		}
	);
	
	const result = response.getData().result;
}
catch( error )
{
	console.error('Error:', error);
}

Как использовать примеры в документации

Ответ в случае успеха
200 OK

{"result":true}


Удалить дополнительное свойство элементов хранилища entity.item.property.delete
Мы еще обновляем эту страницу

Тут может не хватать некоторых данных — дополним в ближайшее время

Scope: entity

Кто может выполнять метод: любой пользователь

Метод удаляет дополнительные свойства элементов хранилища. Пользователь должен обладать правами на управление (Х) хранилищем.

Параметры
Параметр

Описание

ENTITY*
string

Обязательный. Строковый идентификатор хранилища.

PROPERTY*
string

Обязательный. Строковый идентификатор свойства.

Обязательные параметры отмечены *

Примеры
try {
    $response = $b24Service
        ->core
        ->call(
            'entity.item.property.delete',
            [
                'ENTITY'   => 'menu_new',
                'PROPERTY' => 'new_prop',
            ]
        );

    $result = $response
        ->getResponseData()
        ->getResult();

    echo 'Success: ' . print_r($result, true);

} catch (Throwable $e) {
    error_log($e->getMessage());
    echo 'Error deleting entity item property: ' . $e->getMessage();
}

Как использовать примеры в документации

Ответ в случае успеха
200 OK

{"result":true}



Получить список разделов хранилища entity.section.get
Мы еще обновляем эту страницу

Тут может не хватать некоторых данных — дополним в ближайшее время

Scope: entity

Кто может выполнять метод: любой пользователь

Метод entity.section.get получает список разделов хранилища (секций инфоблока). Списочный метод.

Пользователь должен обладать хотя бы правами на чтение (R) хранилища.

Параметры
Параметр

Описание

ENTITY*
string

Обязательный. Строковой идентификатор хранилища.

SORT
unknown

Массив для сортировки, имеющий вид by1=>order1[, by2=>order2 [, ..]], где by1, ... - поле сортировки, может принимать значения:

ID - код раздела;
SECTION - код родительской раздела;
NAME - название раздела;
CODE - символьный код раздела;
ACTIVE - активности раздела
LEFT_MARGIN - левая граница;
DEPTH_LEVEL - глубина вложенности (начинается с 1);
SORT - индекс сортировки;
CREATED - по времени создания раздела;
CREATED_BY - по идентификатору создателя раздела;
MODIFIED_BY - по идентификатору пользователя изменившего раздела;
TIMESTAMP_X - по времени последнего изменения.
order1, ... - порядок сортировки, может принимать значения:

ASC - по возрастанию;
DESC - по убыванию.
Значение по умолчанию Array("SORT"=>"ASC") означает, что результат выборки будет отсортирован по возрастанию. Если задать пустой массив Array(), то результат отсортирован не будет.
FILTER
unknown

Массив вида array("фильтруемое поле"=>"значение" [, ...]). Фильтруемое поле может принимать значения:

ACTIVE - фильтр по активности (Y|N);
NAME - по названию (можно искать по шаблону [%_]);
CODE - по символьному коду (по шаблону [%_]);
SECTION_ID - по коду раздела-родителя (если указать false, то будут возвращены корневые разделы);
DEPTH_LEVEL - по уровню вложенности (начинается с 1);
LEFT_MARGIN, RIGHT_MARGIN - по положению в дереве (используется, когда необходима выборка дерева подразделов);
ID - по коду раздела;
TIMESTAMP_X - по времени последнего изменения;
DATE_CREATE - по времени создания;
MODIFIED_BY - по коду пользователя изменившему раздел;
CREATED_BY - по создателю;
Все фильтруемые поля могут содержать перед названием тип проверки фильтра. Необязательное. По умолчанию записи не фильтруются.
start

Порядковый номер элемента списка, начиная с которого необходимо возвращать следующие элементы при вызове текущего метода. Подробности в статье Особенности списочных методов

Обязательные параметры отмечены *

Примеры
try {
    $response = $b24Service
        ->core
        ->call(
            'entity.section.get',
            [
                'ENTITY' => 'menu_new',
                'SORT'   => [
                    'NAME' => 'ASC'
                ]
            ]
        );

    $result = $response
        ->getResponseData()
        ->getResult();

    $sections = $result->data();

} catch (Throwable $e) {
    error_log($e->getMessage());
    echo 'Error getting entity sections: ' . $e->getMessage();
}

Как использовать примеры в документации

Ответ в случае успеха
200 OK

{
    "result":
    [
        {
            "ID":"219",
            "CODE":null,
            "TIMESTAMP_X":"2013-06-23T10:11:59+03:00",
            "DATE_CREATE":"2013-06-23T10:11:59+03:00",
            "CREATED_BY":"1","MODIFIED_BY":"1",
            "ACTIVE":"Y",
            "SORT":"500",
            "NAME":"Вторая тестовая секция",
            "PICTURE":null,
            "DETAIL_PICTURE":null,
            "DESCRIPTION":null,
            "LEFT_MARGIN":"1",
            "RIGHT_MARGIN":"2",
            "DEPTH_LEVEL":"1",
            "ENTITY":"menu_new",
            "SECTION":null
        },
        {
            "ID":"218",
            "CODE":null,
            "TIMESTAMP_X":"2013-06-23T10:24:46+03:00",
            "DATE_CREATE":"2013-06-23T10:08:54+03:00",
            "CREATED_BY":"1",
            "MODIFIED_BY":"1",
            "ACTIVE":"Y",
            "SORT":"500",
            "NAME":"Первая тестовая секция",
            "PICTURE":null,
            "DETAIL_PICTURE":null,
            "DESCRIPTION":null,
            "LEFT_MARGIN":"3",
            "RIGHT_MARGIN":"4",
            "DEPTH_LEVEL":"1",
            "ENTITY":"menu_new",
            "SECTION":null
        }
    ],
    "total":2
}

Обновить раздел хранилища entity.section.update
Мы еще обновляем эту страницу

Тут может не хватать некоторых данных — дополним в ближайшее время

Scope: entity

Кто может выполнять метод: любой пользователь

Метод entity.section.update обновляет раздел хранилища. Пользователь должен обладать хотя бы правами на запись (W) в хранилище.

Параметры
Параметр

Описание

ENTITY*
string

Обязательный. Строковой идентификатор хранилища.

ID*
integer

Обязательный. Идентификатор обновляемого раздела.

NAME
string

Наименование раздела.

DESCRIPTION
unknown

Описание раздела.

ACTIVE
unknown

Флаг активности раздела (Y|N).

SORT
unknown

Сортировочный параметр раздела.

PICTURE
unknown

Картинка раздела.

DETAIL_PICTURE
unknown

Детальная картинка раздела.

SECTION
unknown

Идентификатор родительского раздела.

Обязательные параметры отмечены *

Примеры
try {
    $response = $b24Service
        ->core
        ->call(
            'entity.section.update',
            [
                'ENTITY' => 'menu_new',
                'ID'     => 220,
                'NAME'   => 'Не очень тестовый раздел',
            ]
        );

    $result = $response
        ->getResponseData()
        ->getResult();

    echo 'Success: ' . print_r($result, true);

} catch (Throwable $e) {
    error_log($e->getMessage());
    echo 'Error updating entity section: ' . $e->getMessage();
}

Как использовать примеры в документации

Ответ в случае успеха
200 OK

{"result":true}

Удалить раздел хранилища entity.section.delete
Мы еще обновляем эту страницу

Тут может не хватать некоторых данных — дополним в ближайшее время

Scope: entity

Кто может выполнять метод: любой пользователь

Метод entity.section.delete удаляет раздел хранилища. Пользователь должен обладать хотя бы правами на запись (W) в хранилище.

Параметры
Параметр

Описание

ENTITY*
string

Обязательный. Строковой идентификатор хранилища.

ID*
integer

Обязательный. Идентификатор удаляемого раздела.

Обязательные параметры отмечены *

Примеры
try {
    $response = $b24Service
        ->core
        ->call(
            'entity.section.delete',
            [
                'ENTITY' => 'menu_new',
                'ID'     => 220
            ]
        );

    $result = $response
        ->getResponseData()
        ->getResult();

    echo 'Success: ' . print_r($result, true);

} catch (Throwable $e) {
    error_log($e->getMessage());
    echo 'Error deleting entity section: ' . $e->getMessage();
}

Как использовать примеры в документации

Ответ в случае успеха
200 OK

{"result":true}

