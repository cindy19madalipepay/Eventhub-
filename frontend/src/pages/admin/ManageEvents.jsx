import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './ManageEvents.css';

const ManageEvents = () => {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data.events || res.data || []);
    } catch (err) {
      toast.error('Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h2>Manage Events</h2>
        <p>View, edit, and manage all published events.</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <Link to="/admin/create-event" className="btn-create-event" style={{ textDecoration: 'none', display: 'inline-block', width: 'auto', padding: '12px 24px' }}>
          + Create New Event
        </Link>
      </div>

      {loading ? (
        <div className="card">
          <p>Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="card">
          <p style={{ color: '#777', textAlign: 'center' }}>No events yet. Click "Create New Event" to get started.</p>
        </div>
      ) : (
        <div className="card">
          {events.map((event) => (
            <div key={event.event_id} className="event-row">
              <div>
                <h3>{event.event_name}</h3>
                <p className="event-meta">{event.venue} • {event.date_start}</p>
                {event.allowed_departments && (
                  <div className="dept-badges">
                    {event.allowed_departments.split(',').map((dept) => (
                      <span key={dept} className="dept-badge">{dept}</span>
                    ))}
                  </div>
                )}
              </div>
              <span className={`status-badge ${event.status}`}>{event.status}</span>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default ManageEvents;