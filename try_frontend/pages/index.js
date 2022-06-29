import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to TRY
        </h1>

        <p className={styles.description}>
         a nfT lotteRY
        </p>

        <div className={styles.grid}>
          <a href="http://localhost:3000/try_lottery" className={styles.card}>
            <h2>Lottery users</h2>
            <p>All the players can buy a ticket and see the lottery status</p>
          </a>

          <a href="http://localhost:3000/try_lottery_manager" className={styles.card}>
            <h2>Lottery Manager </h2>
            <p>This side is reserved only for the lottery manager. Operation restricted</p>
          </a>
        </div>
      </main>
    </div>
  )
}
