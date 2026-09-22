import { BONUS_JAR_SIZE, useProfileStore } from '../../state/profileStore';
import styles from './BonusJar.module.css';

/**
 * Presentational bonus jar: a row of dots that fills as `bonusJarCount`
 * grows, per Section 9.2's colour concept. Kept deliberately simple and
 * self-contained (reads the store directly, no props) so a "word shrinks
 * into the jar" animation can be hooked on later without restructuring it.
 */
export function BonusJar() {
  const bonusJarCount = useProfileStore((s) => s.bonusJarCount);

  return (
    <div
      className={styles.jar}
      role="img"
      aria-label={`Bonus jar, ${bonusJarCount} of ${BONUS_JAR_SIZE} words`}
    >
      {Array.from({ length: BONUS_JAR_SIZE }, (_, i) => (
        <span
          key={i}
          className={`${styles.dot} ${i < bonusJarCount ? styles.filled : ''}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
