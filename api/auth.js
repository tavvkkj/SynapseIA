// api/auth.js
import { promises as fs } from 'fs';
import path from 'path';

// O caminho aponta para o diretório /tmp, que é gravável em ambientes serverless como a Vercel.
// Lembre-se: este armazenamento é temporário e não persistirá entre deployments ou "hibernações" do servidor.
const PROFILES_DB_PATH = path.join('/tmp', 'profiles.json');

// Função para ler o arquivo de perfis de forma segura.
async function readProfiles() {
    try {
        await fs.access(PROFILES_DB_PATH);
        const data = await fs.readFile(PROFILES_DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Se o arquivo não existir ou estiver corrompido, retorna um objeto vazio.
        return {};
    }
}

// Função para escrever no arquivo de perfis.
async function writeProfiles(data) {
    await fs.writeFile(PROFILES_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { ra, isLoginEvent, isSessionCheck, ...profileDataFromClient } = request.body;

        if (!ra) {
            return response.status(400).json({ success: false, message: 'RA é obrigatório.' });
        }

        const profiles = await readProfiles();
        const existingProfile = profiles[ra] || {};

        // REMOVIDO: Nunca salve senhas no seu banco de dados.
        if (profileDataFromClient.password) {
            delete profileDataFromClient.password;
        }

        // NOVO: Lógica para restaurar a sessão sem precisar de login
        if (isSessionCheck) {
            if (existingProfile.ra) {
                console.log(`[AUTH API] Sessão restaurada para o RA: ${ra}`);
                return response.status(200).json({ success: true, profile: existingProfile });
            } else {
                return response.status(404).json({ success: false, message: 'Perfil não encontrado para a sessão ativa.' });
            }
        }
        
        let finalProfile;

        // LÓGICA DE MERGE CORRIGIDA
        if (isLoginEvent) {
            // Durante o login, os dados do cliente (vindos da SED) atualizam o perfil,
            // mas os dados existentes (personalizados pelo usuário, como 'name' e 'profilePic') têm prioridade.
            finalProfile = {
                ...profileDataFromClient, // Aplica os dados novos (email, etc.)
                ...existingProfile,       // Sobrescreve com os dados já salvos (nome/foto personalizados)
            };
        } else {
            // Lógica de edição de perfil: simplesmente mescla as novas alterações.
            finalProfile = {
                ...existingProfile,
                ...profileDataFromClient
            };
        }

        finalProfile.ra = ra; // Garante que o RA esteja sempre presente.

        profiles[ra] = finalProfile;
        await writeProfiles(profiles);

        console.log(`[AUTH API] Perfil salvo para o RA: ${ra}`);
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
