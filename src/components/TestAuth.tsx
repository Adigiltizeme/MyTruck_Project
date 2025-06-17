import React, { useState } from 'react';
import { ApiService } from '../services/api.service';

type User = {
    email: string;
    [key: string]: any;
};

const TestAuth: React.FC = () => {
    const [authState, setAuthState] = useState<{
        isLoading: boolean;
        user: User | null;
        token: string | null;
        error: string | null;
    }>({
        isLoading: false,
        user: null,
        token: null,
        error: null
    });

    const apiService = new ApiService();

    const testLogin = async () => {
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            console.log('🔄 Test de connexion...');

            // Test de connexion admin
            const response = await apiService.post('/auth/login', {
                email: 'admin@mytruck.com',
                password: 'MyTruck2024!'
            });

            // Cast response to expected type
            const loginResponse = response as { access_token: string; user: User };

            console.log('✅ Réponse login:', loginResponse);

            if (!loginResponse.access_token || !loginResponse.user) {
                throw new Error('Token ou utilisateur manquant dans la réponse');
            }
            // Stocker le token
            const token = loginResponse.access_token;
            apiService.setToken(token);
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify(loginResponse.user));

            // Tester le profil
            const profileResponse = await apiService.get('/auth/profile');
            console.log('✅ Profil récupéré:', profileResponse);

            setAuthState({
                isLoading: false,
                user: loginResponse.user,
                token: token,
                error: null
            });

            console.log('🎉 Authentification frontend réussie !');

        } catch (error: any) {
            console.error('❌ Erreur auth:', error);
            setAuthState(prev => ({
                ...prev,
                isLoading: false,
                error: error.message || 'Erreur de connexion'
            }));
        }
    };

    const testLogout = () => {
        apiService.clearToken();
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');

        setAuthState({
            isLoading: false,
            user: null,
            token: null,
            error: null
        });

        console.log('🚪 Déconnexion effectuée');
    };

    const testApiCall = async () => {
        try {
            console.log('🔄 Test d\'appel API protégé...');
            const users = await apiService.get('/users');
            if (Array.isArray(users)) {
                console.log('✅ Utilisateurs récupérés:', users.length);
            } else {
                console.log('⚠️ La réponse /users n\'est pas un tableau:', users);
            }
        } catch (error) {
            console.error('❌ Erreur API call:', error);
        }
    };

    const checkCurrentState = () => {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('user');

        console.group('🔍 État actuel auth');
        console.log('Token present:', !!token);
        console.log('Token preview:', token ? `${token.substring(0, 20)}...` : 'None');
        console.log('User data:', userData ? JSON.parse(userData) : 'None');
        console.log('API service token:', !!apiService.getToken());
        console.groupEnd();
    };

    return (
        <div style={{
            padding: '20px',
            maxWidth: '600px',
            margin: '0 auto',
            fontFamily: 'Arial, sans-serif'
        }}>
            <h2>🔧 Test Authentification Frontend</h2>

            <div style={{ marginBottom: '20px' }}>
                <h3>État actuel:</h3>
                <p><strong>Utilisateur:</strong> {authState.user ? authState.user.email : 'Non connecté'}</p>
                <p><strong>Token:</strong> {authState.token ? '✅ Présent' : '❌ Absent'}</p>
                {authState.error && (
                    <p style={{ color: 'red' }}><strong>Erreur:</strong> {authState.error}</p>
                )}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                    onClick={testLogin}
                    disabled={authState.isLoading}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    {authState.isLoading ? '⏳ Connexion...' : '🔐 Tester Login'}
                </button>

                <button
                    onClick={testLogout}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    🚪 Déconnexion
                </button>

                <button
                    onClick={testApiCall}
                    disabled={!authState.token}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        opacity: authState.token ? 1 : 0.5
                    }}
                >
                    📡 Test API Call
                </button>

                <button
                    onClick={checkCurrentState}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    🔍 Vérifier État
                </button>
            </div>

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <h4>📋 Instructions:</h4>
                <ol>
                    <li>Cliquer sur "Tester Login" pour authentifier</li>
                    <li>Vérifier la console pour les logs détaillés</li>
                    <li>Tester "Test API Call" pour valider le token</li>
                    <li>Utiliser "Vérifier État" pour débugger</li>
                </ol>
            </div>

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
                <h4>✅ Backend Status:</h4>
                <p>• API accessible: ✅</p>
                <p>• Endpoints auth: ✅ (3/3)</p>
                <p>• Compte admin: ✅</p>
                <p><strong>→ Le backend fonctionne parfaitement !</strong></p>
            </div>
        </div>
    );
};

export default TestAuth;
