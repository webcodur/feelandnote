/*
  파일명: /sw/android/settings.gradle.kts
  기능: Gradle 빌드 대상·저장소 선언
  책임: 안드로이드 TWA 셸 프로젝트의 모듈 구성과 의존성 저장소를 고정한다.
*/

pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    // 모듈이 제 저장소를 몰래 추가하지 못하게 막는다. 저장소는 이 파일에서만 정한다.
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "FeelAndNote"

include(":app")
