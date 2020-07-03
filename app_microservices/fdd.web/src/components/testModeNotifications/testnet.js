import React from 'react';
import styles from './styles.m.css';

const TestModeNotification = () => (
  <div className={styles.testMode}>
    You are using a demo version of Flight Delay<br />
    <small>Demo version works on Ethereum testnet.</small>
  </div>
);

export default TestModeNotification;