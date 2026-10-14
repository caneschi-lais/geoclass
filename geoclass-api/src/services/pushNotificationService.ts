import prisma from '../prisma';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

/**
 * Envia notificação Push via Expo Push Service para um ou mais usuários
 * Funciona em celulares Android e iOS que possuam push_token registrado.
 */
export async function sendPushNotification(
  userIds: string | string[],
  payload: PushPayload
) {
  try {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    if (ids.length === 0) return;

    // Buscar usuários que possuam push_token cadastrado
    const usersWithTokens = await prisma.user.findMany({
      where: {
        id: { in: ids },
        push_token: { not: null },
      },
      select: {
        id: true,
        push_token: true,
      },
    });

    const tokens = usersWithTokens
      .map((u) => u.push_token)
      .filter((t): t is string => Boolean(t && (t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken'))));

    if (tokens.length === 0) {
      return;
    }

    // Criar mensagens para cada token
    const messages = tokens.map((to) => ({
      to,
      sound: payload.sound !== undefined ? payload.sound : 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      priority: payload.priority || 'high',
      channelId: payload.channelId || 'default',
    }));

    // Enviar em blocos de até 100 mensagens (limite da Expo API) usando native fetch
    const chunkSize = 100;
    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
          body: JSON.stringify(chunk),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn('⚠️ [PUSH NOTIFICATION] Resposta da Expo Push API:', response.status, errText);
        } else {
          console.log(`📲 [PUSH ENVIADO] ${chunk.length} notificação(ões) enviada(s) via Expo Push com sucesso.`);
        }
      } catch (err: any) {
        console.warn('⚠️ [PUSH NOTIFICATION] Falha de conexão com Expo Push API:', err?.message || err);
      }
    }
  } catch (error: any) {
    console.error('❌ [PUSH NOTIFICATION ERROR]:', error?.message || error);
  }
}
