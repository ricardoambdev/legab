class ConfigManager {
    constructor() {
        this.config = null;
        this.readyCallbacks = [];
        this.errorCallbacks = [];
        this.firebaseEnabled = false;

        this.initFirebase();
    }

    async initFirebase() {
        const firebaseScript = document.createElement('script');
        firebaseScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
        firebaseScript.onload = () => this.initFirebaseApp();
        document.head.appendChild(firebaseScript);
    }

    async initFirebaseApp() {
        try {
            // const firebaseConfig = {
            //     apiKey: "AIzaSyDemo-KEY-REPLACE-WITH-YOURS",
            //     authDomain: "legab-demo.firebaseapp.com",
            //     projectId: "legab-demo",
            //     storageBucket: "legab-demo.appspot.com",
            //     messagingSenderId: "123456789",
            //     appId: "1:123456789:web:abcdef123456"
            // };
            const firebaseConfig = {
                apiKey: "AIzaSyAyFKmq8wy_areJEIO3B39sl3A7upaqVv4",
                authDomain: "legab-50847.firebaseapp.com",
                projectId: "legab-50847",
                storageBucket: "legab-50847.firebasestorage.app",
                messagingSenderId: "897642739207",
                appId: "1:897642739207:web:5ad0d522ec7729c52a9ca2"
            };

            firebase.initializeApp(firebaseConfig);
            this.db = firebase.firestore();
            this.firebaseEnabled = true;

            this.readyCallbacks.forEach(cb => cb());
        } catch (error) {
            console.warn('Firebase não disponível, usando localStorage');
            this.firebaseEnabled = false;
            this.readyCallbacks.forEach(cb => cb());
        }
    }

    onReady(callback) {
        this.readyCallbacks.push(callback);
    }

    onError(callback) {
        this.errorCallbacks.push(callback);
    }

    async saveConfig(config) {
        const configData = {
            ...config,
            updatedAt: new Date().toISOString()
        };

        localStorage.setItem('legab_config', JSON.stringify(configData));

        if (this.firebaseEnabled) {
            try {
                await this.db.collection('configs').doc('main').set(configData);
            } catch (error) {
                console.warn('Firebase save failed, using localStorage only');
            }
        }

        this.config = configData;
        return configData;
    }

    async getConfig() {
        if (this.config) {
            return this.config;
        }

        if (this.firebaseEnabled) {
            try {
                const doc = await this.db.collection('configs').doc('main').get();
                if (doc.exists) {
                    this.config = doc.data();
                    return this.config;
                }
            } catch (error) {
                console.warn('Firebase read failed, using localStorage');
            }
        }

        const stored = localStorage.getItem('legab_config');
        if (stored) {
            this.config = JSON.parse(stored);
            return this.config;
        }

        return null;
    }

    async loadConfigToDevice(config) {
        localStorage.setItem('legab_config', JSON.stringify(config));
        this.config = config;
        return config;
    }

    getFirebaseStatus() {
        return this.firebaseEnabled;
    }
}

window.ConfigManager = ConfigManager;