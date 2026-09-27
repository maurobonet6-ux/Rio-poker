# Enlaces con origen (UTM) para las redes

Pon estos enlaces en la bio y en las descripciones de los vídeos. Así, en **📊 Estadísticas**
(menú de administrador) verás de qué red vienen las cuentas nuevas, los PRO y los packs, y en
Vercel → Analytics verás las visitas por origen.

| Dónde | Enlace |
|---|---|
| Bio de Instagram | https://rio-poker.vercel.app/?utm_source=instagram&utm_medium=bio |
| Bio de TikTok | https://rio-poker.vercel.app/?utm_source=tiktok&utm_medium=bio |
| Canal de YouTube (enlace del perfil) | https://rio-poker.vercel.app/?utm_source=youtube&utm_medium=perfil |
| Descripción de un vídeo de YouTube / Short | https://rio-poker.vercel.app/?utm_source=youtube&utm_medium=video&utm_campaign=NOMBRE-DEL-VIDEO |
| Historias de Instagram (sticker de enlace) | https://rio-poker.vercel.app/?utm_source=instagram&utm_medium=historia |

- Lo que cuenta para las estadísticas de RÍO es `utm_source` (la red). `utm_medium` y `utm_campaign`
  son opcionales y solo se ven en Vercel Analytics.
- Se guarda el origen de la **primera** visita de cada persona: si luego vuelve escribiendo la
  dirección a mano, sigue contando para la red que la trajo.
- Sin `utm_source`, la web intenta adivinarlo por la página de la que viene (instagram.com,
  youtube.com, tiktok.com…). Las apps suelen ocultarlo, por eso conviene usar estos enlaces.
- Cuando tengas dominio propio, cambia `rio-poker.vercel.app` por el nuevo dominio.

## Conversiones en Vercel Analytics

La web manda estos eventos (Vercel → Analytics → Events; necesita el plan Pro de Vercel para verlos):

- **Mano analizada**: alguien pulsa Analizar mano.
- **Cuenta creada**: una cuenta nueva entra por primera vez.
- **Clic pagar**: alguien abre un pago (PRO, anual o pack).
- **PRO pagado**: al volver de Stripe (o con "Ya he pagado, comprobar") la cuenta ya es PRO.

Cada evento lleva `origen` (instagram, tiktok, youtube, directo…). Las visitas y clics del
administrador no cuentan. Las mismas cifras (salvo las visitas) están siempre en 📊 Estadísticas,
aunque no tengas Vercel Pro.
