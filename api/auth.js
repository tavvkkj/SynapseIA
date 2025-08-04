// api/auth.js
import admin from 'firebase-admin';

// --- INÍCIO: INICIALIZAÇÃO DO FIREBASE ---
// Garante que o SDK do Firebase seja inicializado apenas uma vez.
if (!admin.apps.length) {
  try {
    // As credenciais são lidas da variável de ambiente configurada na Vercel.
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Erro na inicialização do Firebase Admin:', error.message);
  }
}

// Referência para o banco de dados Firestore.
const db = admin.firestore();
const profilesCollection = db.collection('profiles');
// --- FIM: INICIALIZAÇÃO DO FIREBASE ---

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { ra, isLoginEvent, isSessionCheck, ...profileDataFromClient } = request.body;

        if (!ra) {
            return response.status(400).json({ success: false, message: 'RA é obrigatório.' });
        }
        
        // Busca o documento do usuário diretamente no Firestore.
        const userProfileRef = profilesCollection.doc(ra);
        const userProfileDoc = await userProfileRef.get();
        const existingProfile = userProfileDoc.exists ? userProfileDoc.data() : {};

        // Remove a senha para nunca salvá-la no banco.
        if (profileDataFromClient.password) {
            delete profileDataFromClient.password;
        }

        // Lógica para restaurar a sessão.
        if (isSessionCheck) {
            if (userProfileDoc.exists) {
                console.log(`[AUTH API] Sessão restaurada para o RA: ${ra} via Firestore.`);
                return response.status(200).json({ success: true, profile: existingProfile });
            } else {
                return response.status(404).json({ success: false, message: 'Perfil não encontrado para a sessão ativa.' });
            }
        }
        
        let finalProfile;

        // Lógica de merge corrigida.
        if (isLoginEvent) {
            finalProfile = {
                ...profileDataFromClient, // Aplica os dados novos (email, etc.)
                ...existingProfile,       // Sobrescreve com os dados já salvos (nome/foto personalizados)
            };
        } else {
            // Lógica de edição de perfil.
            finalProfile = {
                ...existingProfile,
                ...profileDataFromClient
            };
        }

        finalProfile.ra = ra; // Garante que o RA esteja sempre presente.

        // Salva o perfil no Firestore.
        await userProfileRef.set(finalProfile, { merge: true });

        console.log(`[AUTH API] Perfil salvo no Firestore para o RA: ${ra}`);
        return response.status(200).json({
            success: true,
            message: 'Perfil salvo com sucesso.',
            profile: finalProfile
        });

    } catch (error) {
        console.error('[AUTH API] Erro crítico:', error);
        return response.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}
