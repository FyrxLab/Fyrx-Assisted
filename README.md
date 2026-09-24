# FyrxAssisted

Addon modular para bots de [discord.js](https://discord.js.org) que crea y
gestiona **respuestas automatizadas configurables**, para que soporte no
tenga que volver a escribir la misma respuesta dos veces.

```
Usuario: "¿cómo entro con VPN?"
Soporte: //vpn-user
Bot: Si presentas problemas, asegúrate que estés con VPN apagada y...
```

Todo se configura desde Discord con `/fyrxassisted` — sin variables de
entorno ni tocar código.

## Instalación

```bash
npm install @fyrx/fyrx-assisted
```

```js
const { Client, GatewayIntentBits } = require('discord.js');
const setupFyrxAssisted = require('@fyrx/fyrx-assisted');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

setupFyrxAssisted(client);
client.login(process.env.DISCORD_TOKEN);
```

Ver [`example/bot.js`](example/bot.js) para un bot mínimo funcional.

## Disparadores (todos toggleables por servidor)

| Tipo | Ejemplo | Quién puede usarlo |
|---|---|---|
| **Prefijo** | Soporte escribe `//vpn-user` | Rol con *Gestionar mensajes*, o roles extra autorizados |
| **Keyword automático** | El bot detecta "vpn" en cualquier mensaje y responde solo | Cualquiera (con cooldown por canal para no hacer spam) |
| **Slash command** | `/fyrxassisted send id:vpn-user` | Igual que el prefijo |

Activa/desactiva cada uno con `/fyrxassisted config trigger <tipo> <true|false>`.

## Comandos

```
/fyrxassisted config reply-set <id> <text> [keywords]   — crea/edita una respuesta
/fyrxassisted config reply-remove <id>
/fyrxassisted config reply-list
/fyrxassisted config prefix [value]                      — ej. "//", vacío para desactivar
/fyrxassisted config trigger <prefix|keyword|slash> <bool>
/fyrxassisted config role <role> [remove]                — roles extra autorizados
/fyrxassisted config cooldown <seconds>              — espera entre auto-respuestas por canal
/fyrxassisted config logs <true|false>              — logs en consola (debug.txt siempre se guarda)
/fyrxassisted config debug                          — te envía debug.txt
/fyrxassisted config status
/fyrxassisted send <id>
```

Toda la config requiere el permiso *Gestionar servidor* y las respuestas se
guardan en `./fyrx-assisted-data/<guildId>.json` en el proceso del bot que
consume el paquete (no dentro de `node_modules`, para que sobreviva a un
`npm ci`/redeploy).

## Debug

Cada respuesta enviada, comando de configuración y error se guarda siempre en
`fyrx-assisted-data/debug.txt` (rota a 2 MB). `/fyrxassisted config logs false` quita la salida por consola
sin detener el archivo; `/fyrxassisted config debug` te lo envía para compartirlo. Contiene fragmentos de mensajes.

## Integración con fyrx-ai

`@fyrx/fyrx-assisted` expone `matchReply(guildId, content)` para que otro
addon en el mismo cliente compruebe si ya existe una respuesta enlatada
antes de gastar una llamada a IA:

```js
const fyrxAssisted = require('@fyrx/fyrx-assisted');
const match = fyrxAssisted.matchReply(message.guild.id, message.content);
if (match) {
    // ya respondido por fyrx-assisted (o respóndelo tú mismo) — no llames a fyrx-ai
}
```

A partir de `@fyrx/fyrxai@1.3.0`, su propio listener de `messageCreate` respeta
automáticamente `message.fyrxAssistedHandled` (lo marca `fyrx-assisted` tras
responder), así que con ambos addons montados sobre el mismo `client` no hay
doble respuesta — basta con montar `fyrx-assisted` antes de `fyrx-ai`:

```js
setupFyrxAssisted(client);
setupFyrxAI(client);
```

## Licencia

MIT
