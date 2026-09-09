import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import PropTypes from 'prop-types';
import { Bar, Doughnut } from 'react-chartjs-2';
import styles from './AdminCharts.module.css';

ChartJS.register(ArcElement, BarElement, CategoryScale, Legend, LinearScale, Tooltip);

const STATUS_LABELS = {
  PENDING: 'In attesa',
  ACCEPTED: 'Accettate',
  REJECTED: 'Rifiutate',
  RETURNED: 'Restituite',
  CANCELLED: 'Annullate',
};
const STATUS_COLORS = ['#bd7d20', '#5c1f35', '#9d2f2f', '#526b4f', '#78645a'];
const CHART_OPTIONS = {
  animation: false,
  maintainAspectRatio: false,
  responsive: true,
  plugins: {
    legend: { position: 'bottom' },
  },
};

function formatMonth(value) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('it-IT', { month: 'short', year: 'numeric' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

export function AdminCharts({ loanRequestsByStatus, loanRequestsByMonth }) {
  const statusData = {
    labels: loanRequestsByStatus.map(({ status }) => STATUS_LABELS[status]),
    datasets: [
      {
        data: loanRequestsByStatus.map(({ count }) => count),
        backgroundColor: STATUS_COLORS,
        borderColor: '#fffaf2',
        borderWidth: 2,
      },
    ],
  };
  const monthlyLabels = loanRequestsByMonth.map(({ month }) => formatMonth(month));
  const monthlyData = {
    labels: monthlyLabels,
    datasets: [
      {
        label: 'Richieste',
        data: loanRequestsByMonth.map(({ count }) => count),
        backgroundColor: '#7b3048',
        borderColor: '#5c1f35',
        borderWidth: 1,
      },
    ],
  };

  return (
    <section className={styles.grid} aria-label="Grafici delle richieste">
      <article className={styles.card}>
        <h2>Richieste per stato</h2>
        <div className={styles.chart}>
          <Doughnut
            data={statusData}
            options={CHART_OPTIONS}
            role="img"
            aria-label="Grafico ad anello delle richieste per stato"
          />
        </div>
        <table>
          <caption>Valori del grafico delle richieste per stato</caption>
          <thead>
            <tr>
              <th scope="col">Stato</th>
              <th scope="col">Richieste</th>
            </tr>
          </thead>
          <tbody>
            {loanRequestsByStatus.map(({ status, count }) => (
              <tr key={status}>
                <th scope="row">{STATUS_LABELS[status]}</th>
                <td>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className={styles.card}>
        <h2>Richieste per mese</h2>
        {loanRequestsByMonth.length > 0 ? (
          <>
            <div className={styles.chart}>
              <Bar
                data={monthlyData}
                options={{
                  ...CHART_OPTIONS,
                  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                }}
                role="img"
                aria-label="Grafico a barre delle richieste aggregate per mese"
              />
            </div>
            <table>
              <caption>Valori del grafico delle richieste per mese</caption>
              <thead>
                <tr>
                  <th scope="col">Mese</th>
                  <th scope="col">Richieste</th>
                </tr>
              </thead>
              <tbody>
                {loanRequestsByMonth.map(({ month, count }, index) => (
                  <tr key={month}>
                    <th scope="row">{monthlyLabels[index]}</th>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className={styles.empty}>Non sono ancora presenti richieste da aggregare.</p>
        )}
      </article>
    </section>
  );
}

AdminCharts.propTypes = {
  loanRequestsByStatus: PropTypes.arrayOf(
    PropTypes.shape({
      status: PropTypes.oneOf(Object.keys(STATUS_LABELS)).isRequired,
      count: PropTypes.number.isRequired,
    }),
  ).isRequired,
  loanRequestsByMonth: PropTypes.arrayOf(
    PropTypes.shape({
      month: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    }),
  ).isRequired,
};
