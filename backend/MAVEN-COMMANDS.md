# Maven commands / Команды Maven

Параллельные описания: в таблицах первая колонка — исходный текст, вторая — параллельный перевод. Блоки команд между таблицами — на всю ширину.

| Общие сведения | General |
| :-- | :-- |
| Рабочий каталог — `backend` (рядом лежит `pom.xml`). | Use the `backend` directory (where `pom.xml` lives). |

```powershell
cd E:\MyProjects\GeoSun\tms-geosun-v1\tms-geosun-v1\backend
```

| Общие сведения | General |
| :-- | :-- |
| Нужен **JDK 21** (см. `java.version` в `pom.xml`). | Requires **JDK 21** (see `java.version` in `pom.xml`). |

| Запуск приложения | Run the application |
| :-- | :-- |
| Обычный запуск через Spring Boot. | Standard run via the Spring Boot plugin. |

```powershell
mvn spring-boot:run
```

| Запуск приложения | Run the application |
| :-- | :-- |
| Профиль Spring: в конфиге по умолчанию `dev`; можно явно указать профиль. | Spring profile: default in config is `dev`; you can pass a profile explicitly. |

```powershell
mvn spring-boot:run "-Dspring-boot.run.profiles=dev"
mvn spring-boot:run "-Dspring-boot.run.profiles=test"
```

| Запуск приложения | Run the application |
| :-- | :-- |
| То же через переменную окружения в PowerShell. | Same idea using a PowerShell environment variable. |

```powershell
$env:SPRING_PROFILES_ACTIVE = "dev"
mvn spring-boot:run
```

| Сборка и компиляция | Build and compile |
| :-- | :-- |
| Только компиляция. | Compile only. |

```powershell
mvn compile
```

| Сборка и компиляция | Build and compile |
| :-- | :-- |
| Чистая пересборка классов. | Clean rebuild of compiled classes. |

```powershell
mvn clean compile
```

| Сборка и компиляция | Build and compile |
| :-- | :-- |
| Собрать JAR без тестов (быстрее). | Build the JAR without running tests (faster). |

```powershell
mvn clean package "-DskipTests"
```

| Сборка и компиляция | Build and compile |
| :-- | :-- |
| Полный пакет вместе с тестами. | Full package build including tests. |

```powershell
mvn clean package
```

| Сборка и компиляция | Build and compile |
| :-- | :-- |
| Готовый артефакт. | The packaged artifact path. |
| `target/tms-geosun-backend-java-0.0.1-SNAPSHOT.jar` | `target/tms-geosun-backend-java-0.0.1-SNAPSHOT.jar` |

| Сборка и компиляция | Build and compile |
| :-- | :-- |
| Запуск уже собранного JAR. | Run the already-built JAR with the JVM. |

```powershell
java -jar target\tms-geosun-backend-java-0.0.1-SNAPSHOT.jar
```

| Тесты и проверка | Tests and CI-like checks |
| :-- | :-- |
| Запуск модульных и интеграционных тестов. | Run unit and integration tests. |

```powershell
mvn test
mvn clean test
```

| Тесты и проверка | Tests and CI-like checks |
| :-- | :-- |
| Фаза **verify**: тесты, отчёт JaCoCo, проверка Spotless, порог покрытия JaCoCo (задан в `pom.xml`). | **verify** phase: tests, JaCoCo report, Spotless check, JaCoCo coverage gate (configured in `pom.xml`). |

```powershell
mvn clean verify
```

| Тесты и проверка | Tests and CI-like checks |
| :-- | :-- |
| Запустить один тестовый класс или один метод. | Run a single test class or a single test method. |

```powershell
mvn test "-Dtest=TestClassName"
mvn test "-Dtest=TestClassName#methodName"
```

| Форматирование кода | Code formatting (Spotless) |
| :-- | :-- |
| Проверить стиль без правок файлов. | Check formatting without modifying files. |

```powershell
mvn spotless:check
```

| Форматирование кода | Code formatting (Spotless) |
| :-- | :-- |
| Автоматически применить Google Java Format и остальные правила из `pom.xml`. | Apply Google Java Format and other Spotless rules from `pom.xml`. |

```powershell
mvn spotless:apply
```

| Зависимости и отладка сборки | Dependencies and build introspection |
| :-- | :-- |
| Дерево зависимостей; подтянуть артефакты; посмотреть итоговый эффективный POM. | Dependency tree; resolve artifacts; inspect the effective POM. |

```powershell
mvn dependency:tree
mvn dependency:resolve
mvn help:effective-pom
```

| Зависимости и отладка сборки | Dependencies and build introspection |
| :-- | :-- |
| Меньше шума в консоли. | Quieter console output. |

```powershell
mvn -q compile
```

| Покрытие тестами | Coverage (JaCoCo) |
| :-- | :-- |
| После `mvn test` или `mvn verify` откройте HTML-отчёт. | After `mvn test` or `mvn verify`, open the HTML report. |
| `target/site/jacoco/index.html` | `target/site/jacoco/index.html` |

| Замечания | Notes |
| :-- | :-- |
| `mvn verify` может упасть на Spotless или на пороге JaCoCo — это ожидаемо, если стиль не прогнан или покрытие ниже лимита. | `mvn verify` may fail on Spotless or the JaCoCo gate if formatting is off or coverage is below the threshold. |
| Профили `dev`, `test`, `prod` лежат в `application-*.yml`; активный профиль задаётся через `SPRING_PROFILES_ACTIVE` (в `application.yml` по умолчанию подставляется `dev`). | Profiles `dev`, `test`, `prod` live in `application-*.yml`; active profile comes from `SPRING_PROFILES_ACTIVE` (`application.yml` defaults to `dev` when unset). |
