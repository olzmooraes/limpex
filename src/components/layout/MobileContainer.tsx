import React from 'react';
import styles from './MobileContainer.module.css';

interface MobileContainerProps {
  children: React.ReactNode;
}

export const MobileContainer: React.FC<MobileContainerProps> = ({ children }) => {
  return (
    <div className={styles.wrapper}>
      <main className={styles.phoneViewport}>
        {children}
      </main>
    </div>
  );
};
