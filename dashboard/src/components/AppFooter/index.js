import React from 'react';
import { Mail, Linkedin, Facebook, Instagram } from 'lucide-react';

const AppFooter = () => {
    return (
        <footer className="bg-gray-100 px-6 md:px-12 py-6">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                {/* Copyright */}
                <div className="text-gray-600 text-sm flex items-center">
                    <span>© {new Date().getFullYear()} Aegeus Technologies. All rights reserved.</span>
                </div>

                {/* Contact Information */}
                <div className="text-gray-700 text-sm flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span>info@aegeus.in</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <span className="text-gray-400">|</span>
                        <span className="ml-2 flex items-center space-x-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h3m-3-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                            <span>+91 6362764541</span>
                        </span>
                    </div>
                </div>

                {/* Social Media Icons */}
                <div className="flex space-x-3">
                    <a href="https://www.facebook.com/aegeustechnologies/" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">
                        <Facebook className="h-5 w-5 text-blue-600" />
                    </a>
                    <a href="https://www.instagram.com/aegeustech/" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">
                        <Instagram className="h-5 w-5 text-pink-600" />
                    </a>
                    <a href="https://in.linkedin.com/company/aegeus-technologies-private-limited" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">
                        <Linkedin className="h-5 w-5 text-blue-700" />
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default AppFooter;