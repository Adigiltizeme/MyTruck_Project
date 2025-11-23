import React from 'react';
import Deliveries from './Deliveries';

/**
 * Page des cessions inter-magasins
 * ✅ REFACTORÉ : Utilise maintenant Deliveries.tsx avec filtre type=INTER_MAGASIN
 * Une cession = une commande avec type='INTER_MAGASIN'
 */
const Cessions: React.FC = () => {
    return <Deliveries type="INTER_MAGASIN" />;
};

export default Cessions;