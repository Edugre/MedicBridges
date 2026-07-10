import React from 'react';
import { useLang } from '../../context/LangContext';

const CONTENT = {
  en: {
    title: "Data & privacy policy — MedicBridges",
    lastUpdated: "Last updated: July 2026",
    intro: "MedicBridges is a student project built by students at Florida International University (FIU). Our purpose is to help you find information about accessible or free clinics and pharmacies near you. We are not a medical provider, we do not diagnose, and regardless of how we generate revenue, we do not sell, rent, or share your personal data with advertisers or other third parties for commercial purposes.",
    s1Title: "1. Who we are",
    s1Body: "MedicBridges is a project created by FIU students, with the goal of connecting uninsured or under-resourced individuals with accessible care options in the Miami-Dade area. We may generate revenue to support and grow the project (for example, through partnerships, sponsorships, or premium features), but monetizing user data is not part of that model. We are not a medical entity and do not act on behalf of any clinic.",
    s2Title: "2. What information we collect",
    s2BodyIntro: "Depending on how you use the site, we may collect:",
    s2List1: "Information you give us directly: symptoms you describe in the chat, your area or zip code, your insurance status (uninsured, Medicaid, private), and anything else you choose to type.",
    s2List2: "Basic technical information: browser type, pages visited, and aggregated usage data to improve the site (for example, through standard analytics tools like Google Analytics).",
    s2List3: "What we do NOT intentionally collect: we do not ask for your full legal name, Social Security number, insurance policy number, or payment information. The chat is designed so it can be used anonymously.",
    s3Title: "3. How we use your information",
    s3BodyIntro: "We use the information only to:",
    s3List1: "Help you find clinics or pharmacies that match your situation.",
    s3List2: "Improve the accuracy and usefulness of the chat assistant.",
    s3List3: "Understand, in aggregate and anonymized form, what kinds of needs site users have (for example, \"how many people are looking for dental care\"), without identifying any specific person.",
    s3BodyOutro: "We do not sell your personal information, and we do not share it with insurers, employers, or other third parties for their own commercial purposes. If MedicBridges generates revenue in the future (for example, through sponsorships, grants, or paid features), that revenue will not come from selling or renting individual users' personal data.",
    s4Title: "4. Who we share information with",
    s4List1: "Technical service providers: we use services such as Supabase (database) and Anthropic's API (Claude) to operate the chat. These providers process data on our behalf under their own privacy terms; as of this writing they do not use your conversations for their own commercial purposes or model training, but you should verify each provider's current terms before publishing this policy, since terms can change.",
    s4List2: "We do not share your information with clinics, insurers, employers, or any other organization without your explicit consent (for example, if a future feature lets you \"send my info to this clinic to book an appointment\").",
    s4List3: "We may disclose information if required by law (for example, in response to a valid court order).",
    s5Title: "5. Chat conversations",
    s5Body: "If we store your chat history (for example, to improve the service), we do so in anonymized form whenever possible, and only with your consent. You can use the chat without creating an account or giving your name.",
    s6Title: "6. About health information",
    s6Body: "Even though you may discuss symptoms with our chat, MedicBridges is not a healthcare provider, and this policy does not give you the same legal protections you would have with a doctor or hospital under laws like HIPAA. We recommend not sharing more detail than necessary to find a clinic — for example, avoid entering your Social Security number or details of prior diagnoses.",
    s7Title: "7. Security",
    s7Body: "We take reasonable steps to protect the information we collect (for example, restricting access to our database and using encrypted connections), but no system is 100% secure. By using the site, you understand that transmitting information over the internet carries inherent risk.",
    s8Title: "8. Your choices",
    s8List1: "You can use the chat without giving your name or creating an account.",
    s8List2: "You can ask us to delete any data tied to your conversation by emailing medibridge@fiu.edu.",
    s8List3: "You can stop using the site at any time; this does not automatically erase data already stored, but you may request deletion.",
    s9Title: "9. Minors",
    s9Body: "MedicBridges is intended for individuals 18 and older. If you are a minor, we recommend using this site alongside a trusted adult or seeking health resources designed for minors directly.",
    s10Title: "10. Changes to this policy",
    s10Body: "We may update this policy as the project grows. We'll post the date of the most recent update at the top of this page.",
    s11Title: "11. Contact",
    s11Body: "If you have questions about this policy or how we handle your information, contact us at medibridge@fiu.edu."
  },
  es: {
    title: "Política de datos y privacidad — MedicBridges",
    lastUpdated: "Última actualización: Julio de 2026",
    intro: "MedicBridges es un proyecto estudiantil creado por estudiantes de Florida International University (FIU). Nuestro propósito es ayudarle a encontrar información sobre clínicas y farmacias accesibles o gratuitas cerca de usted. No somos un proveedor médico, no diagnosticamos, e independientemente de cómo generemos ingresos, no vendemos, alquilamos ni compartimos sus datos personales con anunciantes u otros terceros con fines comerciales.",
    s1Title: "1. Quiénes somos",
    s1Body: "MedicBridges es un proyecto creado por estudiantes de FIU, con el objetivo de conectar a personas sin seguro o con recursos limitados con opciones de atención accesible en el área de Miami-Dade. Es posible que generemos ingresos para respaldar y hacer crecer el proyecto (por ejemplo, mediante asociaciones, patrocinios o funciones premium), pero monetizar los datos de los usuarios no es parte de ese modelo. No somos una entidad médica y no actuamos en nombre de ninguna clínica.",
    s2Title: "2. Qué información recopilamos",
    s2BodyIntro: "Dependiendo de cómo use el sitio, podemos recopilar:",
    s2List1: "Información que nos da directamente: síntomas que describe en el chat, su área o código postal, su estado de seguro (sin seguro, Medicaid, privado) y cualquier otra cosa que elija escribir.",
    s2List2: "Información técnica básica: tipo de navegador, páginas visitadas y datos de uso agregados para mejorar el sitio (por ejemplo, a través de herramientas de análisis estándar como Google Analytics).",
    s2List3: "Lo que NO recopilamos intencionalmente: no le pedimos su nombre legal completo, número de Seguro Social, número de póliza de seguro o información de pago. El chat está diseñado para que pueda usarse de forma anónima.",
    s3Title: "3. Cómo usamos su información",
    s3BodyIntro: "Utilizamos la información solo para:",
    s3List1: "Ayudarle a encontrar clínicas o farmacias que coincidan con su situación.",
    s3List2: "Mejorar la precisión y utilidad del asistente de chat.",
    s3List3: "Comprender, de forma agregada y anónima, qué tipo de necesidades tienen los usuarios del sitio (por ejemplo, \"cuántas personas buscan atención dental\"), sin identificar a ninguna persona específica.",
    s3BodyOutro: "No vendemos su información personal y no la compartimos con aseguradoras, empleadores u otros terceros para sus propios fines comerciales. Si MedicBridges genera ingresos en el futuro (por ejemplo, mediante patrocinios, subvenciones o funciones de pago), esos ingresos no provendrán de vender o alquilar los datos personales de los usuarios individuales.",
    s4Title: "4. Con quién compartimos información",
    s4List1: "Proveedores de servicios técnicos: utilizamos servicios como Supabase (base de datos) y la API de Anthropic (Claude) para operar el chat. Estos proveedores procesan datos en nuestro nombre bajo sus propios términos de privacidad; al momento de escribir este documento, no utilizan sus conversaciones para sus propios fines comerciales o de entrenamiento de modelos, pero debe verificar los términos actuales de cada proveedor, ya que los términos pueden cambiar.",
    s4List2: "No compartimos su información con clínicas, aseguradoras, empleadores ni ninguna otra organización sin su consentimiento explícito (por ejemplo, si una función futura le permite \"enviar mi información a esta clínica para programar una cita\").",
    s4List3: "Podemos divulgar información si la ley lo exige (por ejemplo, en respuesta a una orden judicial válida).",
    s5Title: "5. Conversaciones de chat",
    s5Body: "Si almacenamos su historial de chat (por ejemplo, para mejorar el servicio), lo hacemos en forma anónima siempre que sea posible, y solo con su consentimiento. Puede usar el chat sin crear una cuenta o dar su nombre.",
    s6Title: "6. Acerca de la información de salud",
    s6Body: "Aunque pueda hablar de síntomas en nuestro chat, MedicBridges no es un proveedor de atención médica, y esta política no le otorga las mismas protecciones legales que tendría con un médico u hospital bajo leyes como HIPAA. Recomendamos no compartir más detalles de los necesarios para encontrar una clínica; por ejemplo, evite ingresar su número de Seguro Social o detalles de diagnósticos previos.",
    s7Title: "7. Seguridad",
    s7Body: "Tomamos medidas razonables para proteger la información que recopilamos (por ejemplo, restringiendo el acceso a nuestra base de datos y utilizando conexiones encriptadas), pero ningún sistema es 100% seguro. Al utilizar el sitio, usted comprende que transmitir información por Internet conlleva riesgos inherentes.",
    s8Title: "8. Sus opciones",
    s8List1: "Puede usar el chat sin dar su nombre ni crear una cuenta.",
    s8List2: "Puede pedirnos que eliminemos cualquier dato vinculado a su conversación enviando un correo a medibridge@fiu.edu.",
    s8List3: "Puede dejar de usar el sitio en cualquier momento; esto no borra automáticamente los datos ya almacenados, pero puede solicitar su eliminación.",
    s9Title: "9. Menores de edad",
    s9Body: "MedicBridges está destinado a personas mayores de 18 años. Si es menor de edad, le recomendamos usar este sitio junto con un adulto de confianza o buscar recursos de salud diseñados directamente para menores.",
    s10Title: "10. Cambios a esta política",
    s10Body: "Podemos actualizar esta política a medida que crezca el proyecto. Publicaremos la fecha de la actualización más reciente en la parte superior de esta página.",
    s11Title: "11. Contacto",
    s11Body: "Si tiene preguntas sobre esta política o sobre cómo manejamos su información, contáctenos en medibridge@fiu.edu."
  }
};

const Privacy = () => {
  const { lang } = useLang();
  const t = CONTENT[lang];

  return (
    <div className="page-container" style={{ padding: '4rem 2rem', maxWidth: '1200px', animation: 'fadeIn 0.6s ease-out' }}>
      
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{t.title}</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--mb-text-secondary)', fontWeight: 600 }}>{t.lastUpdated}</p>
        <div style={{ display: 'inline-block', padding: '0.25rem 1rem', backgroundColor: 'var(--mb-lime-soft)', color: 'var(--mb-accent)', borderRadius: 'var(--mb-radius-pill)', marginTop: '1rem', border: '1px solid var(--mb-true-lime)' }}>
          Florida International University — Student Research Project
        </div>
      </div>

      <div className="mb-bento-card privacy-card" style={{ padding: '3rem' }}>
        
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem', fontSize: '1.1rem' }}>
          {t.intro}
        </p>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--mb-text-primary)' }}>{t.s1Title}</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
          {t.s1Body}
        </p>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--mb-text-primary)' }}>{t.s2Title}</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
          {t.s2BodyIntro}
        </p>
        <ul style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem', paddingLeft: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>{t.s2List1}</li>
          <li style={{ marginBottom: '0.5rem' }}>{t.s2List2}</li>
          <li>{t.s2List3}</li>
        </ul>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--mb-text-primary)' }}>{t.s3Title}</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
          {t.s3BodyIntro}
        </p>
        <ul style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>{t.s3List1}</li>
          <li style={{ marginBottom: '0.5rem' }}>{t.s3List2}</li>
          <li>{t.s3List3}</li>
        </ul>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
          {t.s3BodyOutro}
        </p>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--mb-text-primary)' }}>{t.s4Title}</h2>
        <ul style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem', paddingLeft: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>{t.s4List1}</li>
          <li style={{ marginBottom: '0.5rem' }}>{t.s4List2}</li>
          <li>{t.s4List3}</li>
        </ul>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--mb-text-primary)' }}>{t.s5Title}</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
          {t.s5Body}
        </p>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--mb-text-primary)' }}>{t.s6Title}</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
          {t.s6Body}
        </p>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--mb-text-primary)' }}>{t.s7Title}</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
          {t.s7Body}
        </p>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--mb-text-primary)' }}>{t.s8Title}</h2>
        <ul style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem', paddingLeft: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>{t.s8List1}</li>
          <li style={{ marginBottom: '0.5rem' }}>{t.s8List2}</li>
          <li>{t.s8List3}</li>
        </ul>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--mb-text-primary)' }}>{t.s9Title}</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
          {t.s9Body}
        </p>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--mb-text-primary)' }}>{t.s10Title}</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
          {t.s10Body}
        </p>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--mb-text-primary)' }}>{t.s11Title}</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
          {t.s11Body}
        </p>

      </div>

      <style>{`
        @media (max-width: 640px) {
          .privacy-card { padding: 1.5rem !important; }
        }
      `}</style>
    </div>
  );
};

export default Privacy;
