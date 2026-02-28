import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPage from './components/MainPage';
import EmailVerification from './components/EmailVerification';
import { FusionProvider } from './components/FusionContext';

const App: React.FC = () => {
    return (
        <FusionProvider>
            <Router>
                <div className="App">
                    <Routes>
                        <Route path="/" element={<MainPage/>} />
                        <Route path="/verify-email" element={<EmailVerification />} />
                        <Route path="/reset-password" element={<EmailVerification />} />
                    </Routes>
                </div>
            </Router>
        </FusionProvider>
    );
};

export default App;