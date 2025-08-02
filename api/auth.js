// api/auth.js
import { promises as fs } from 'fs';
import path from 'path';

// **CORREÇÃO:** Altera o caminho para o diretório /tmp, que é gravável na Vercel.
const PROFILES_DB_PATH = path.join('/tmp', 'profiles.json');

// Função para ler o arquivo de perfis
async function readProfiles() {
    try {
        await fs.access(PROFILES_DB_PATH); // Verifica se o arquivo existe
        const data = await fs.readFile(PROFILES_DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Se o arquivo não existir ou ocorrer outro erro na leitura, retorna um objeto vazio.
        return {};
    }
}

// Função para escrever no arquivo de perfis
async function writeProfiles(data) {
    await fs.writeFile(PROFILES_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { ra, isLoginEvent, ...profileDataFromClient } = request.body;

        if (!ra) {
            return response.status(400).json({ message: 'RA é obrigatório.' });
        }

        console.log(`[AUTH API] Requisição recebida para RA: ${ra}. É um evento de login? ${!!isLoginEvent}`);

        const profiles = await readProfiles();
        const existingProfile = profiles[ra] || {};

        let finalProfile;

        if (isLoginEvent) {
            // LÓGICA DE LOGIN
            let mergedProfile = { ...existingProfile, ...profileDataFromClient };
            
            if (existingProfile.name) {
                mergedProfile.name = existingProfile.name;
            }

            if (existingProfile.profilePic) {
                mergedProfile.profilePic = existingProfile.profilePic;
            }
            
            finalProfile = mergedProfile;

        } else {
            // LÓGICA DE EDIÇÃO DE PERFIL
            finalProfile = {
                ...existingProfile,
                ...profileDataFromClient
            };
        }
        
        // Garante que o campo 'ra' esteja sempre presente
        finalProfile.ra = ra;

        profiles[ra] = finalProfile;
        await writeProfiles(profiles);

        // Retorna o perfil final e correto para o frontend
        return response.status(200).json({ 
            success: true, 
            message: 'Perfil salvo com sucesso.',
            profile: finalProfile 
        });

    } catch (error) {
        console.error('[AUTH API] Erro crítico:', error);
        return response.status(500).json({ message: 'Internal Server Error' });
    }
}
