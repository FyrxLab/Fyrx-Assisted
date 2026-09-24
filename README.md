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

Requisitos: Node.js 18+, discord.js 14.27+, el intent privilegiado **Message Content**
activado en el Developer Portal y el scope `applications.commands` al invitar el bot.

Para probar el paquete: `node test.js`.

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

## Integración con FyrxAI

[`@fyrx/fyrxai`](https://github.com/FyrxLab/fyrx-ai) es el agente de soporte con IA
de FyrxLab. Juntos cubren todo el soporte: FyrxAssisted responde lo repetitivo con
texto fijo (gratis e instantáneo) y FyrxAI responde el resto con la documentación.

Con ambos en el mismo `client` no hay doble respuesta: FyrxAssisted marca
`message.fyrxAssistedHandled` **antes** de responder y FyrxAI ignora ese mensaje sin
llamar a la IA. Solo hay que montar FyrxAssisted primero:

```js
setupFyrxAssisted(client);
setupFyrxAI(client);
```

Los dos registran sus comandos sin borrar los del otro (`/fyrxassisted` y `/fyrxai`
conviven en el mismo servidor).

Para otro addon propio, `matchReply(guildId, content)` dice si un mensaje ya tiene
respuesta enlatada:

```js
const fyrxAssisted = require('@fyrx/fyrx-assisted');
const match = fyrxAssisted.matchReply(message.guild.id, message.content);
if (match) {
    // FyrxAssisted ya lo responde; no gastes una llamada a IA
}
```

## Licencia

MIT
