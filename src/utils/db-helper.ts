export async function safeDbOperation<T>(
    operation: () => Promise<T>,
    fallback: T,
    operationName: string = 'Database operation',
    retryCount: number = 1
): Promise<T> {
    let lastError: any = null;

    for (let attempt = 0; attempt < retryCount + 1; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;

            // Si c'est la dernière tentative, on journalise l'erreur
            if (attempt === retryCount) {
                console.error(`${operationName} failed after ${retryCount + 1} attempts:`, error);

                // Vérifier si c'est une erreur de corruption ou de base fermée
                if (
                    error.name === 'DatabaseClosedError' ||
                    error.message?.includes('UnknownError: Internal error') ||
                    error.message?.includes('DatabaseClosedError')
                ) {
                    console.warn('Détection d\'une base de données potentiellement corrompue');

                    // Afficher une notification pour l'utilisateur
                    if (window.confirm(
                        'Une erreur a été détectée dans la base de données locale. ' +
                        'Voulez-vous essayer une réinitialisation pour résoudre ce problème?'
                    )) {
                        // Stocker l'état de la session (utilisateur connecté)
                        const userData = localStorage.getItem('user');

                        // Vider le localStorage sauf données critiques
                        localStorage.clear();
                        if (userData) localStorage.setItem('user', userData);

                        // Recharger la page
                        window.location.reload();
                        return fallback; // Ne sera jamais atteint en raison du rechargement
                    }
                }
            } else {
                // Attendre avant de réessayer (backoff exponentiel)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
            }
        }
    }

    // Si toutes les tentatives échouent, retourner la valeur par défaut
    return fallback;
}