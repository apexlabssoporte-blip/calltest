import { FastifyPluginAsync } from "fastify";

const supportEmail = "apexlabssoporte@gmail.com";

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="es-419">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | CallTest</title>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p><strong>Última actualización:</strong> 6 de septiembre de 2026</p>
    ${body}
    <hr>
    <p>Contacto: <a href="mailto:${supportEmail}">${supportEmail}</a></p>
    <nav aria-label="Documentos legales">
      <a href="/privacy">Privacidad</a> ·
      <a href="/terms">Términos</a> ·
      <a href="/account-deletion">Eliminar cuenta</a>
    </nav>
  </main>
</body>
</html>`;
}

const privacyBody = `
<p>Esta Política de Privacidad explica cómo CallTest trata la información de testers y desarrolladores que usan la aplicación y sus servicios.</p>
<h2>Información que tratamos</h2>
<ul>
  <li>Datos de cuenta: nombre, correo electrónico, rol y credenciales protegidas mediante hash.</li>
  <li>Contenido de uso: aplicaciones, campañas, misiones, comentarios, reportes y evidencias que decidas enviar.</li>
  <li>Datos técnicos y de seguridad: identificadores de instalación tratados mediante hash, dirección IP, agente de usuario, registros de actividad, errores y señales antifraude.</li>
  <li>Progreso: participación, reputación, experiencia y puntos o recompensas internas sin valor monetario.</li>
</ul>
<h2>Finalidades</h2>
<p>Usamos estos datos para crear y proteger cuentas, asignar pruebas, validar misiones, mostrar progreso, prevenir fraude, atender reportes, operar el servicio y cumplir obligaciones legales.</p>
<h2>Proveedores</h2>
<p>Usamos proveedores que procesan información para operar CallTest: Render para la aplicación y el caché, Neon para la base de datos y Cloudflare R2 para almacenar evidencias. No vendemos datos personales ni los usamos para publicidad dirigida.</p>
<h2>Conservación y seguridad</h2>
<p>Conservamos la información mientras la cuenta esté activa y durante el tiempo razonablemente necesario para seguridad, prevención de fraude y obligaciones legales. Aplicamos controles de acceso, cifrado en tránsito, credenciales protegidas y registros de auditoría.</p>
<h2>Tus opciones</h2>
<p>Puedes solicitar acceso, corrección o eliminación escribiendo al correo de soporte. También puedes eliminar la cuenta desde la aplicación. Al eliminarla, CallTest anonimiza los identificadores personales y revoca las sesiones; ciertos registros de auditoría, seguridad o recompensas pueden conservarse de forma no identificable cuando sean necesarios para proteger la integridad del servicio.</p>
<h2>Menores</h2>
<p>CallTest está dirigido a personas mayores de 18 años.</p>
<h2>Cambios</h2>
<p>Publicaremos en esta página cualquier cambio material de esta política.</p>`;

const termsBody = `
<p>Estos términos regulan el uso de CallTest. Al crear una cuenta o usar el servicio aceptas estas condiciones.</p>
<h2>Elegibilidad y cuenta</h2>
<p>Debes tener al menos 18 años. Eres responsable de mantener seguras tus credenciales y de proporcionar información correcta.</p>
<h2>Uso del servicio</h2>
<p>CallTest conecta desarrolladores con testers para realizar campañas y misiones de prueba. Debes seguir las instrucciones de cada misión, respetar a otros usuarios y enviar únicamente contenido que tengas derecho a compartir.</p>
<h2>Contenido prohibido</h2>
<p>No puedes enviar contenido ilegal, engañoso, dañino, sexual, violento, discriminatorio, malicioso ni que infrinja derechos de terceros. CallTest puede rechazar evidencias, limitar funciones o suspender cuentas para proteger la comunidad.</p>
<h2>Puntos y recompensas</h2>
<p>La experiencia, los puntos y las recompensas Gold son elementos internos de progreso. No representan dinero, depósitos, inversiones, criptomonedas ni activos transferibles y no tienen valor monetario garantizado.</p>
<h2>Disponibilidad</h2>
<p>Trabajamos para mantener el servicio disponible y seguro, pero pueden existir interrupciones, cambios o mantenimiento. Las pruebas no garantizan la aprobación de una app en Google Play.</p>
<h2>Terminación</h2>
<p>Puedes dejar de usar CallTest y eliminar tu cuenta en cualquier momento. También podemos restringir cuentas que incumplan estos términos o pongan en riesgo el servicio.</p>
<h2>Cambios</h2>
<p>Podemos actualizar estos términos cuando cambie el servicio o la normativa. La versión vigente estará publicada aquí.</p>`;

const deletionBody = `
<p>CallTest permite solicitar la eliminación de tu cuenta y de los datos personales asociados.</p>
<h2>Desde la aplicación</h2>
<ol>
  <li>Inicia sesión en CallTest.</li>
  <li>Abre la sección de tu cuenta o perfil.</li>
  <li>Selecciona <strong>Eliminar cuenta</strong> y confirma la solicitud.</li>
</ol>
<h2>Por correo electrónico</h2>
<p>Si no puedes entrar a la aplicación, escribe desde el correo asociado a tu cuenta a <a href="mailto:${supportEmail}?subject=Eliminar%20mi%20cuenta%20de%20CallTest">${supportEmail}</a> con el asunto “Eliminar mi cuenta de CallTest”. Podremos pedirte información razonable para verificar que la cuenta te pertenece.</p>
<h2>Qué se elimina</h2>
<p>Se revocan tus sesiones y se anonimizan tu nombre, correo, credenciales e identificadores personales. Las evidencias almacenadas se eliminan o desvinculan cuando corresponde.</p>
<h2>Qué puede conservarse</h2>
<p>Podemos conservar registros de auditoría, seguridad, prevención de fraude y movimientos de recompensas de forma anonimizada cuando sea necesario para proteger a los usuarios, mantener la integridad del sistema o cumplir obligaciones legales.</p>`;

export const legalRoutes: FastifyPluginAsync = async (fastify) => {
  const html = (content: string) => ({
    handler: async (_request: unknown, reply: { type: (value: string) => { send: (body: string) => unknown } }) =>
      reply.type("text/html; charset=utf-8").send(content),
  });

  fastify.get("/privacy", html(page("Política de Privacidad", privacyBody)));
  fastify.get("/terms", html(page("Términos de Uso", termsBody)));
  fastify.get("/account-deletion", html(page("Eliminación de Cuenta", deletionBody)));
};
