import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './Dashboard.css';
import SidePanel from './SidePanel';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboard, faChartLine, faMedkit, faCalendarAlt, faDownload } from '@fortawesome/free-solid-svg-icons';
import { phqService } from '../services/phqService';

// Register required components for Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [scores, setScores] = useState([]);
  const navigate = useNavigate();

  // Retrieve userId and username from local storage
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');

  // Redirect to login if no userId is available
  useEffect(() => {
    if (!userId) {
      navigate('/');
    }
  }, [userId, navigate]);

  // Fetch user's PHQ-9 scores from the database
  useEffect(() => {
    const fetchScores = async () => {
      try {
        const data = await phqService.getAllTestScores();
        console.log('Raw API response:', data);
        setScores(data);
      } catch (error) {
        console.error('Error fetching scores:', error);
        if (error.message === 'Session expired. Please login again.') {
          navigate('/');
        }
      }
    };

    if (userId) {
      fetchScores();
    }
  }, [userId, navigate]);

  // Prepare data for the chart
  console.log('Current scores state:', scores);
  const chartData = {
    labels: scores.map((score) => {
      const date = new Date(score.created_at);
      console.log('Processing date:', score.created_at, 'to:', date.toLocaleDateString());
      return date.toLocaleDateString();
    }),
    datasets: [
      {
        label: 'PHQ-9 Test Scores',
        data: scores.map((score) => {
          console.log('Processing score:', score.score);
          return score.score;
        }),
        borderColor: '#88c8f7',
        backgroundColor: 'rgba(136, 200, 247, 0.2)',
        tension: 0.3,
      },
    ],
  };
  console.log('Chart data prepared:', chartData);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Score',
        },
        beginAtZero: true,
      },
    },
  };

  // Function to download table data as PDF
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text('PHQ-9 Test Score Details', 14, 10); // Title of the PDF

    // Define the table headers and rows
    const tableColumn = ['Date', 'Time', 'Score'];
    const tableRows = scores.map((score) => [
      new Date(score.created_at).toLocaleDateString(),
      new Date(score.created_at).toLocaleTimeString(),
      score.score,
    ]);

    // Add table to the PDF
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    // Save the PDF
    doc.save('phq9-test-scores.pdf');
  };

  return (
    <div className="dashboard-container">
      {/* Use SidePanel */}
      <SidePanel username={username} />

      {/* Main Content */}
      <div className="main-content">
        <h1 className="dashboard-heading">Dashboard</h1>
        <hr />

        {/* Statistic Boxes */}
        <div className="stats-boxes">
          <div className="stats-box">
            <FontAwesomeIcon icon={faClipboard} className="box-icon" />
            <div>Total Tests</div>
            <div>{scores.length}</div>
          </div>
          <div className="stats-box">
            <FontAwesomeIcon icon={faChartLine} className="box-icon" />
            <div>Average Score</div>
            <div>
              {scores.length > 0 ? (scores.reduce((a, b) => a + b.score, 0) / scores.length).toFixed(2) : 0}
            </div>
          </div>
          <div className="stats-box">
            <FontAwesomeIcon icon={faCalendarAlt} className="box-icon" />
            <div>Highest Score</div>
            <div>{scores.length > 0 ? Math.max(...scores.map((s) => s.score)) : 0}</div>
          </div>
          <div
            className="stats-box clickable-box"
            onClick={() =>
              window.open('https://nimh.health.gov.lk/en/appointment-form-navodaya-patient-booking-system/', '_blank')
            }
          >
            <FontAwesomeIcon icon={faMedkit} className="box-icon" />
            <div>Make Doctor Appointment</div>
          </div>
        </div>

        {/* Chart and Table */}
        <div className="chart-and-table">
          <div className="chart-container">
            <h3>PHQ-9 Test Trends</h3>
            <Line data={chartData} options={chartOptions} />
          </div>

          <div className="table-container">
            <div className="table-header">
              <h3>Test Score Details</h3>
              <button className="download-button" onClick={downloadPDF}>
                <FontAwesomeIcon icon={faDownload} /> Download PDF
              </button>
            </div>
            <table className="score-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {scores.length > 0 ? (
                  scores.map((score, index) => (
                    <tr key={index}>
                      <td>{new Date(score.created_at).toLocaleDateString()}</td>
                      <td>{new Date(score.created_at).toLocaleTimeString()}</td>
                      <td>{score.score}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3">No test scores available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
