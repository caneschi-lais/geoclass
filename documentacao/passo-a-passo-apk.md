# Guia de Geração de APK com Expo Application Services (EAS CLI)

Este guia prático detalha passo a passo como gerar um arquivo **APK** instalável para dispositivos Android a partir do aplicativo mobile (`geoclass-mobile`) utilizando o **EAS Build**.

---

## 🎯 Pré-requisitos
Antes de começar, certifique-se de possuir:
1. Uma conta cadastrada no site do [Expo](https://expo.dev/).
2. O **Node.js** instalado na sua máquina de desenvolvimento.
3. O **EAS CLI** instalado globalmente ou acessível via `npx`. Para instalar globalmente:
   ```bash
   npm install -g eas-cli
   ```

---

## 📂 Passo 1: Entrar no Diretório do Projeto Mobile
Como o projeto está estruturado em múltiplos diretórios (API e Mobile), você deve executar todos os comandos relativos ao aplicativo a partir da pasta do mobile:

```bash
cd geoclass-mobile
```

---

## 🔑 Passo 2: Fazer Login na sua Conta Expo
No terminal, faça login na sua conta do Expo:

```bash
eas login
```
*Insira seu e-mail/usuário e senha do Expo conforme solicitado.*

---

## ⚙️ Passo 3: Configurar o Identificador do Aplicativo (`app.json`)
O Android exige um identificador único de pacote (Package Name) para poder buildar o aplicativo. 

1. Abra o arquivo `geoclass-mobile/app.json`.
2. Adicione a chave `"package"` dentro da seção `"android"`. O formato deve ser reversamente hierárquico (ex: `com.seuusuario.geoclass`).

Veja o exemplo de como o `app.json` deve ficar:

```json
{
  "expo": {
    "name": "mobile",
    "slug": "mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "package": "com.lais.geoclass",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-secure-store",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "O GeoClass precisa da sua localização estritamente para confirmar sua presença no raio da sala de aula..."
        }
      ]
    ]
  }
}
```

---

## 🛠️ Passo 4: Inicializar e Configurar o EAS Build (`eas.json`)
Para gerar um arquivo **APK** (instalável diretamente no celular) em vez do padrão **AAB** (usado para publicar na Google Play Store), precisamos criar e editar o arquivo de configuração `eas.json`.

### Passo 4.1: Gerar o arquivo inicial
Execute o comando abaixo para que o EAS crie a estrutura inicial:

```bash
eas build:configure
```
*   *O CLI perguntará para quais plataformas você deseja configurar. Selecione **Android** (ou **All** se desejar configurar iOS também no futuro).*
*   *Esse comando criará um arquivo chamado `eas.json` na raiz da pasta `geoclass-mobile`.*

### Passo 4.2: Configurar para gerar APK
1. Abra o arquivo recém-criado `geoclass-mobile/eas.json`.
2. Altere o perfil de `preview` (ou crie um perfil personalizado) para que ele use o tipo de build `apk`. 

Substitua o conteúdo do `eas.json` pelo seguinte modelo recomendado:

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

> [!IMPORTANT]
> A chave `"buildType": "apk"` inserida no perfil de `preview` é o segredo para instruir os servidores do Expo a compilarem o projeto em um formato `.apk` instalável diretamente no seu celular de testes.

---

## 🏗️ Passo 5: Iniciar o Build do APK
Com tudo configurado, execute o comando de build apontando para a plataforma Android e utilizando o perfil `preview` que alteramos:

```bash
eas build --platform android --profile preview
```

### ❓ O que acontece durante a primeira execução:
Durante o primeiro build, o EAS fará algumas perguntas no terminal:
1. **"Would you like to log in to your Expo account?"** (Caso não tenha feito antes, faça login).
2. **"Generate a new Android Keystore?"**
   *   **Responda Sim (`Y` / `Yes`)**. A Keystore é a assinatura criptográfica necessária para qualquer aplicativo Android. O Expo salvará essa assinatura com segurança nos servidores dele, facilitando builds futuros.

---

## 📥 Passo 6: Acompanhar o Progresso e Instalar o APK

1. **Acompanhar o Build:** O terminal mostrará o andamento do build e fornecerá um link da web (Ex: `https://expo.dev/accounts/.../builds/...`). Você pode abrir esse link para acompanhar o progresso em tempo real de forma visual.
2. **Tempo de Espera:** O build é processado nas nuvens da Expo. O tempo total pode variar de 3 a 10 minutos dependendo da fila de servidores gratuitos do Expo.
3. **Instalação:** Assim que o build for finalizado, o terminal imprimirá um **QR Code** grande e um link direto para o download do arquivo `.apk`.
   *   **Opção A (QR Code):** Aponte a câmera do seu celular Android para o QR Code no terminal. O link abrirá uma página da Expo onde você poderá baixar e instalar o aplicativo diretamente no aparelho.
   *   **Opção B (Link Direto):** Copie o link do APK gerado pelo terminal, faça o download no seu computador e transfira o arquivo para o seu celular.

> [!WARNING]
> Ao instalar o APK no seu aparelho Android, o sistema emitirá um aviso dizendo que o app é de "Fontes Desconhecidas" (uma proteção padrão para aplicativos que não vêm da Google Play Store). Você deve clicar em **"Instalar assim mesmo"** ou habilitar a opção **"Permitir desta fonte"** para concluir a instalação.
