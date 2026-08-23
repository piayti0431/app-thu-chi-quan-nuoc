package com.giadinh.nuocmia;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private static final String TRUSTED_APK_HOST = "rbvpsaotqmddtvcxkyxz.supabase.co";
    private static final String TRUSTED_APK_PATH_PREFIX = "/storage/v1/object/public/app-releases/";
    private static final long MAX_APK_BYTES = 50L * 1024L * 1024L;
    private static final String SHA256_PATTERN = "^[a-fA-F0-9]{64}$";

    @PluginMethod
    public void getVersion(PluginCall call) {
        try {
            PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            JSObject result = new JSObject();
            result.put("versionName", info.versionName);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                result.put("versionCode", info.getLongVersionCode());
            } else {
                result.put("versionCode", info.versionCode);
            }
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Cannot read app version", error);
        }
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        String apkUrl = call.getString("url");
        if (apkUrl == null || apkUrl.trim().isEmpty()) {
            call.reject("Missing APK URL");
            return;
        }
        if (!isTrustedApkUrl(apkUrl)) {
            call.reject("Untrusted APK URL");
            return;
        }
        String expectedSha256 = call.getString("sha256");
        if (expectedSha256 == null || !expectedSha256.matches(SHA256_PATTERN)) {
            call.reject("Missing or invalid APK checksum");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.reject("Please allow this app to install updates, then tap update again");
            return;
        }

        new Thread(() -> {
            try {
                File downloadDir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (downloadDir == null) {
                    throw new IllegalStateException("Cannot open download directory");
                }
                File apkFile = new File(downloadDir, "app-thu-chi-quan-nuoc-update.apk");
                String actualSha256 = downloadApk(apkUrl, apkFile);
                if (!actualSha256.equals(expectedSha256.toLowerCase(Locale.ROOT))) {
                    throw new IllegalStateException("APK checksum mismatch");
                }
                getActivity().runOnUiThread(() -> {
                    try {
                        openInstaller(apkFile);
                        JSObject result = new JSObject();
                        result.put("path", apkFile.getAbsolutePath());
                        call.resolve(result);
                    } catch (Exception error) {
                        call.reject("Cannot open Android installer", error);
                    }
                });
            } catch (Exception error) {
                getActivity().runOnUiThread(() -> call.reject("Cannot download or install update", error));
            }
        }).start();
    }

    private String downloadApk(String apkUrl, File apkFile) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(apkUrl).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(30000);
        connection.connect();

        int status = connection.getResponseCode();
        if (status < 200 || status >= 300) {
            throw new IllegalStateException("Server returned HTTP " + status);
        }
        int declaredLength = connection.getContentLength();
        if (declaredLength > MAX_APK_BYTES) {
            throw new IllegalStateException("APK is too large");
        }

        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(apkFile)) {
            byte[] buffer = new byte[8192];
            int read;
            long totalRead = 0;
            while ((read = input.read(buffer)) != -1) {
                totalRead += read;
                if (totalRead > MAX_APK_BYTES) {
                    throw new IllegalStateException("APK is too large");
                }
                digest.update(buffer, 0, read);
                output.write(buffer, 0, read);
            }
        } finally {
            connection.disconnect();
        }
        return toHex(digest.digest());
    }

    private void openInstaller(File apkFile) {
        if (!apkFile.getName().endsWith(".apk")) {
            throw new IllegalArgumentException("Invalid APK file");
        }
        Uri apkUri = FileProvider.getUriForFile(
            getContext(),
            getContext().getPackageName() + ".fileprovider",
            apkFile
        );
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }

    private boolean isTrustedApkUrl(String apkUrl) {
        try {
            URL parsed = new URL(apkUrl);
            return parsed.getProtocol().equals("https")
                && parsed.getHost().equals(TRUSTED_APK_HOST)
                && parsed.getPath().startsWith(TRUSTED_APK_PATH_PREFIX)
                && parsed.getPath().endsWith(".apk");
        } catch (Exception error) {
            return false;
        }
    }

    private String toHex(byte[] bytes) {
        StringBuilder hex = new StringBuilder(bytes.length * 2);
        for (byte item : bytes) {
            hex.append(String.format(Locale.ROOT, "%02x", item));
        }
        return hex.toString();
    }
}
