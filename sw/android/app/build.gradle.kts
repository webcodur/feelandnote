/*
  파일명: /sw/android/app/build.gradle.kts
  기능: 앱 모듈 빌드 설정
  책임: TWA 셸의 대상 SDK·식별자·서명 구성을 정한다.
*/

import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
}

// 서명값은 추적 대상이 아닌 keystore.properties 에서만 읽는다. 없으면 릴리스 서명 없이 동기화만 된다.
val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) {
        keystorePropertiesFile.inputStream().use { load(it) }
    }
}
val hasKeystore = keystoreProperties.getProperty("storeFile")?.isNotBlank() == true

android {
    namespace = "com.feelandnote.app"

    // Play 는 2026-08-31 부터 신규 앱·업데이트에 API 36(Android 16) 이상을 요구한다.
    compileSdk = 36

    defaultConfig {
        // ⚠️ 확정 필요 — 배포 후에는 사실상 바꿀 수 없다. 상표·조직 소유와 기존 사용 여부를 확인한 뒤 확정한다.
        // 웹의 /.well-known/assetlinks.json 라우트 기본값(ANDROID_APP_PACKAGE_NAME)과 반드시 같아야 한다.
        applicationId = "com.feelandnote.app"

        // TWA 는 Custom Tabs 를 지원하는 브라우저가 화면을 그린다. 그 보급률과 Play 최소 지원 구간을
        // 함께 보아 Android 6.0 을 하한으로 둔다. 더 낮추면 폴백 경로 검증 부담만 늘고 실익이 없다.
        minSdk = 23
        targetSdk = 36

        versionCode = 1
        versionName = "1.0.0"
    }

    signingConfigs {
        if (hasKeystore) {
            create("release") {
                storeFile = file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            // 셸에는 난독화할 자체 코드가 없다. 라이브러리 클래스만 지목하므로 축소를 끈다.
            isMinifyEnabled = false
            isShrinkResources = false
            if (hasKeystore) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
        debug {
            applicationIdSuffix = ".debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(libs.androidbrowserhelper)
}
