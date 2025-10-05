Expo + react-native-maps setup (EAS dev-client)

This project uses Expo. `react-native-maps` is a native module and requires a custom dev client (EAS) or a bare workflow.

Follow these steps on your machine (PowerShell) to enable the native map:

1) Install EAS CLI (if you don't have it):

```powershell
npm install -g eas-cli
```

2) Install the library into the project:

```powershell
npm install react-native-maps
```

3) Configure `app.json`:

- Add your Android and iOS API keys for Google Maps if you want Google provider (optional but recommended for Android).
- Your `app.json` already includes the plugin stub for `react-native-maps`. Add keys under `android.config.googleMaps.apiKey` and `ios.config.googleMapsApiKey`.

4) Login to EAS (you need an Expo account):

```powershell
eas login
```

5) Build a development client including the native module (example for Android):

```powershell
eas build --profile development --platform android
```

or for iOS:

```powershell
eas build --profile development --platform ios
```

6) Install the generated dev-client on your device/emulator and start Metro with the dev-client flag:

```powershell
npx expo start --dev-client
```

7) Open the dev-client app on your device and the project will connect to Metro.

Troubleshooting:
- If `npm install react-native-maps` fails with native build errors, paste the full terminal output here and I will diagnose.
- If you prefer not to use EAS, you can eject to bare RN and follow the manual linking steps (pods for iOS, gradle for Android).

Notes:
- I added a temporary `declarations/react-native-maps.d.ts` so TypeScript doesn't error before installing the package. You can remove it after installing the real dependency.
- After you finish the EAS dev-client build and confirm the map works, I can remove the placeholder UI and enable draggable markers and reverse-geocoding on drag.

If you want, I can also commit sample `app.json` changes with placeholders for the API keys (I already added them). Reply with your Google Maps API keys (or tell me to leave placeholders) and I'll finish wiring them.
