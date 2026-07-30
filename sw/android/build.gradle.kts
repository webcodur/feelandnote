/*
  파일명: /sw/android/build.gradle.kts
  기능: 루트 빌드 스크립트
  책임: 하위 모듈이 쓸 플러그인을 선언만 하고, 루트에서는 적용하지 않는다.
*/

plugins {
    alias(libs.plugins.android.application) apply false
}
