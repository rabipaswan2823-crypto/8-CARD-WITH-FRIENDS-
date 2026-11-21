from pathlib import Path

manifest_path = Path("android/app/src/main/AndroidManifest.xml")
text = manifest_path.read_text(encoding="utf-8")

perms = (
    '    <uses-permission android:name="android.permission.CAMERA" />\n'
    '    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n'
    '    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />\n'
)

if "android.permission.CAMERA" not in text:
    text = text.replace("<application", perms + "    <application", 1)
    manifest_path.write_text(text, encoding="utf-8")
    print("Patched AndroidManifest.xml with Camera & Mic permissions.")
