# Keep Kotlin serialization metadata used by API request/response models.
-keepattributes RuntimeVisibleAnnotations,AnnotationDefault,InnerClasses,EnclosingMethod
-keep,includedescriptorclasses class com.calltest.tester.data.network.**$$serializer { *; }
-keepclassmembers class com.calltest.tester.data.network.** {
    *** Companion;
}
