'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient, Session } from '@supabase/supabase-js'
import {
  Box, CssBaseline, AppBar, Toolbar, Typography, Container, Paper, CircularProgress,
  IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Fade, InputAdornment,
  Select, MenuItem, FormControl, InputLabel, Stack, Link,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material'
import { Grid } from '@mui/material'
import {
  Dashboard as DashboardIcon, People as PeopleIcon, Flight as FlightIcon, VpnKey as VpnKeyIcon,
  CreditCard as CreditCardIcon, Policy as PolicyIcon, Delete as DeleteIcon, Add as AddIcon,
  Edit as EditIcon, Menu as MenuIcon, Notifications as NotificationsIcon, Cake as CakeIcon,
  Search as SearchIcon, ArrowUpward as ArrowUpwardIcon, ArrowDownward as ArrowDownwardIcon,
  Logout as LogoutIcon, UploadFile as UploadFileIcon, Description as DescriptionIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'

dayjs.extend(relativeTime)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// --- TYPE DEFINITIONS ---
interface BaseEntity { id: string; created_at: string; }
export interface Client extends BaseEntity { first_name: string; last_name: string; email_id: string; mobile_no: string; dob: string; nationality: string; }
export interface Booking extends BaseEntity { client_id: string; reference: string; vendor: string; destination: string; check_in: string; check_out: string; confirmation_no: string; seat_reference: string; meal_preference: string; special_requirement: string; booking_type: string; pnr: string; departure_date?: string; }
export interface Visa extends BaseEntity { client_id: string; country: string; visa_type: string; visa_number: string; issue_date: string; expiry_date: string; notes: string; }
export interface Passport extends BaseEntity { client_id: string; passport_number: string; issue_date: string; expiry_date: string; }
export interface Policy extends BaseEntity { client_id: string; booking_id: string; policy_number: string; insurer: string; sum_insured: number; start_date: string; end_date: string; premium_amount: number; }
export interface Reminder { type: string; id: string; name: string; days_left?: number; client_id?: string; [key: string]: any; }
interface ClientDocument extends BaseEntity { client_id: string; file_name: string; file_path: string; }


const drawerWidth = 240;
const rightDrawerWidth = 320;
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

// --- AUTHENTICATION COMPONENT ---
const AuthComponent = ({ setSession }: { setSession: (session: Session | null) => void }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const { data, error } = isLogin
            ? await supabase.auth.signInWithPassword({ email, password })
            : await supabase.auth.signUp({ email, password });

        setLoading(false);
        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else if (data.session) {
            setSession(data.session);
        } else if (!isLogin) {
            setMessage({ type: 'success', text: 'Please check your email to verify your account!' });
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <CssBaseline />
            <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5">
                    Travel Agency CRM
                </Typography>
                <Typography component="h2" variant="subtitle1" sx={{ mt: 2 }}>
                    {isLogin ? 'Sign In' : 'Sign Up'}
                </Typography>
                <Box component="form" onSubmit={handleAuth} noValidate sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : (isLogin ? 'Sign In' : 'Sign Up')}
                    </Button>
                    {message && <Alert severity={message.type}>{message.text}</Alert>}
                    <Grid container>
                        <Grid item={true}>
                            <Link href="#" variant="body2" onClick={() => setIsLogin(!isLogin)}>
                                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                            </Link>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </Container>
    );
};


// --- MAIN DASHBOARD PAGE ---
export default function DashboardPage() {
  // --- STATE MANAGEMENT ---
  const [session, setSession] = useState<Session | null>(null);
  const [clients, setClients] = useState<Client[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [visas, setVisas] = useState<Visa[]>([])
  const [passports, setPassports] = useState<Passport[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [activeView, setActiveView] = useState('Dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)

  const [openModal, setOpenModal] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [selectedItem, setSelectedItem] = useState<Client | Booking | Visa | Passport | Policy | null>(null)
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({}); 
  
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, view: string} | null>(null);

  // Document Upload Modal State
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [selectedClientForDocs, setSelectedClientForDocs] = useState<Client | null>(null);

  // --- AUTHENTICATION ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } = {} } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  // --- DEBOUNCING SEARCH INPUT ---
  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => {
        clearTimeout(handler);
    };
  }, [searchTerm]);


  // --- DATA FETCHING ---
  const fetchData = useCallback(async () => {
    if (!session) return; // Don't fetch if not logged in
    setLoading(true)
    setError(null)
    try {
      const [
        clientsRes, bookingsRes, visasRes, passportsRes, policiesRes
      ] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('bookings').select('*'),
        supabase.from('visas').select('*'),
        supabase.from('passports').select('*'),
        supabase.from('policies').select('*'),
      ]);

      if (clientsRes.error) throw new Error(`Clients: ${clientsRes.error.message}`);
      if (bookingsRes.error) throw new Error(`Bookings: ${bookingsRes.error.message}`);
      if (visasRes.error) throw new Error(`Visas: ${visasRes.error.message}`);
      if (passportsRes.error) throw new Error(`Passports: ${passportsRes.error.message}`);
      if (policiesRes.error) throw new Error(`Policies: ${policiesRes.error.message}`);

      setClients((clientsRes.data as Client[]) || []);
      setBookings((bookingsRes.data as Booking[]) || []);
      setVisas((visasRes.data as Visa[]) || []);
      setPassports((passportsRes.data as Passport[]) || []);
      setPolicies((policiesRes.data as Policy[]) || []);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- REMINDER GENERATION ---
  const reminders = useMemo<Reminder[]>(() => {
    const today = dayjs();
    const allReminders: Reminder[] = [];
    const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.first_name || 'Unknown';

    clients.forEach(client => {
        const dob = dayjs(client.dob);
        if (!dob.isValid()) return;
        let birthdayThisYear = dob.year(today.year());
        if (birthdayThisYear.isBefore(today, 'day')) birthdayThisYear = birthdayThisYear.add(1, 'year');
        const daysLeft = birthdayThisYear.diff(today, 'day');
        if (daysLeft >= 0 && daysLeft <= 365) {
            allReminders.push({ type: 'Birthday', id: client.id, name: `${client.first_name} ${client.last_name}`, dob: client.dob, days_left: daysLeft, client_id: client.id });
        }
    });
    
    const checkExpiry = (items: (Passport | Visa | Policy)[], type: 'Passport' | 'Visa' | 'Policy', threshold: number) => {
        items.forEach(item => {
            const expiryDateField = 'expiry_date' in item ? item.expiry_date : 'end_date' in item ? item.end_date : null;
            if (!expiryDateField) return;

            const expiryDate = dayjs(expiryDateField);
            if (!expiryDate.isValid()) return;
            const daysLeft = expiryDate.diff(today, 'day');
            if (daysLeft >= 0 && daysLeft <= threshold) { 
                 allReminders.push({ type, id: item.id, client_id: item.client_id, name: getClientName(item.client_id), expiry_date: expiryDate.format('YYYY-MM-DD'), days_left: daysLeft });
            }
        });
    };
    checkExpiry(passports, 'Passport', 365);
    checkExpiry(visas, 'Visa', 365);
    checkExpiry(policies, 'Policy', 365);

    bookings.forEach(booking => {
        const departureDate = dayjs(booking.departure_date);
        if (!departureDate.isValid()) return;
        const daysLeft = departureDate.diff(today, 'day');
        if (daysLeft >= 0 && daysLeft <= 365) {
            allReminders.push({ type: 'Booking', id: booking.id, client_id: booking.client_id, name: getClientName(booking.client_id), pnr: booking.pnr, departure_date: booking.departure_date, days_left: daysLeft });
        }
    });
    
    return allReminders.sort((a,b) => (a.days_left ?? 999) - (b.days_left ?? 999));
  }, [clients, bookings, visas, passports, policies]);

  // --- CRUD OPERATIONS ---
  const handleAddItem = async (itemData: unknown) => {
    const tableName = activeView.toLowerCase();
    const { error } = await supabase.from(tableName).insert([itemData]);
    if (error) setError(`Error adding item: ${error.message}`);
    else { fetchData(); handleCloseModal(); }
  };

  const handleUpdateItem = async (itemData: unknown) => {
    const tableName = activeView.toLowerCase();
    if (typeof itemData === 'object' && itemData !== null && 'id' in itemData) {
      const { id, ...updateData } = itemData as {id: string};
      const { error } = await supabase.from(tableName).update(updateData).eq('id', id);
      if (error) setError(`Error updating item: ${error.message}`);
      else { fetchData(); handleCloseModal(); }
    }
  };

  const handleDeleteItem = (id: string, view: string) => {
    setItemToDelete({id, view});
    setConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    const tableName = itemToDelete.view.toLowerCase();
    const { error } = await supabase.from(tableName).delete().eq('id', itemToDelete.id);
    if (error) setError(`Error deleting item: ${error.message}`);
    else fetchData();
    setConfirmOpen(false);
    setItemToDelete(null);
  };

  // --- MODAL & DRAWER HANDLERS ---
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleOpenModal = (mode: 'add' | 'edit', item: unknown = null) => {
    setModalMode(mode);
    setSelectedItem(item as any);
    setOpenModal(true);
  };
  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedItem(null);
  };
  const handleOpenDocModal = (client: Client) => {
    setSelectedClientForDocs(client);
    setDocModalOpen(true);
  }
  const handleCloseDocModal = () => {
    setDocModalOpen(false);
    setSelectedClientForDocs(null);
  }

  const handleReminderClick = (reminder: Reminder) => {
    if (reminder.type === 'Birthday' || reminder.type === 'Passport' || reminder.type === 'Visa' || reminder.type === 'Policy' || reminder.type === 'Booking') {
        if (reminder.client_id) {
            const client = clients.find(c => c.id === reminder.client_id);
            if (client) {
                setActiveView('Clients');
                handleOpenModal('edit', client);
            }
        }
    }
  };


  // --- UI CONFIGURATION & FILTERING ---
  const getFieldsForView = (view: string) => {
    switch (view) {
        case 'Clients': return { first_name: '', last_name: '', email_id: '', mobile_no: '', dob: '', nationality: '' };
        case 'Bookings': return { client_id: '', pnr: '', booking_type: '', destination: '', check_in: '', check_out: '', vendor: '', reference: '', confirmation_no: '', seat_reference: '', meal_preference: '', special_requirement: '' };
        case 'Visas': return { client_id: '', country: '', visa_type: '', visa_number: '', issue_date: '', expiry_date: '', notes: '' };
        case 'Passports': return { client_id: '', passport_number: '', issue_date: '', expiry_date: ''};
        case 'Policies': return { client_id: '', booking_id: '', policy_number: '', insurer: '', sum_insured: 0, start_date: '', end_date: '', premium_amount: 0 };
        default: return {};
    }
  };

  const handleSort = (column: string) => {
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(newDirection);
  };

  const handleFilterChange = (column: string, value: string) => {
    setFilters(prev => ({ ...prev, [column]: value }));
  };
  
  const filteredData = useMemo(() => {
    const dataMap = { Clients: clients, Bookings: bookings, Visas: visas, Passports: passports, Policies: policies };
    let currentData = dataMap[activeView as keyof typeof dataMap] || [];

    if (debouncedSearchTerm) {
        const lowercasedFilter = debouncedSearchTerm.toLowerCase();
        currentData = currentData.filter(item =>
            Object.values(item).some(val => String(val).toLowerCase().includes(lowercasedFilter))
        );
    }

    currentData = currentData.filter(item => Object.entries(filters).every(([key, val]) => !val || String((item as any)[key]).toLowerCase().includes(val.toLowerCase())));

    if (sortColumn) {
        currentData.sort((a, b) => {
            const aVal = (a as any)[sortColumn];
            const bVal = (b as any)[sortColumn];
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return currentData;
  }, [debouncedSearchTerm, activeView, clients, bookings, visas, passports, policies, sortColumn, sortDirection, filters]);

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, view: 'Dashboard' },
    { text: 'Clients', icon: <PeopleIcon />, view: 'Clients' },
    { text: 'Bookings', icon: <FlightIcon />, view: 'Bookings' },
    { text: 'Visas', icon: <VpnKeyIcon />, view: 'Visas'},
    { text: 'Passports', icon: <CreditCardIcon />, view: 'Passports' },
    { text: 'Policies', icon: <PolicyIcon />, view: 'Policies'},
  ];

  const drawer = (
    <div>
      <Toolbar sx={{ bgcolor: 'primary.main', color: 'white' }}><Typography variant="h6" noWrap>SWTravels</Typography></Toolbar>
      <List sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
        <Box>
            {menuItems.map(item => (
                <ListItem key={item.text} disablePadding>
                    <ListItemButton selected={activeView === item.view} onClick={() => { setActiveView(item.view); setMobileOpen(false); }}>
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                    </ListItemButton>
                </ListItem>
            ))}
        </Box>
        <ListItem disablePadding sx={{ mt: 'auto' }}>
          <ListItemButton onClick={() => supabase.auth.signOut()}>
            <ListItemIcon><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  // --- RENDER FUNCTIONS ---
  const renderContent = () => {
    if (loading) return <Grid container justifyContent="center" sx={{mt: 4}}><CircularProgress /></Grid>;
    if (error) return <Grid item xs={12}><Alert severity="error">{error}</Alert></Grid>;

    switch (activeView) {
        case 'Dashboard': return <DashboardView stats={{clients: clients.length, bookings: bookings.length}} clientData={clients} bookingData={bookings} policyData={policies} />;
        case 'Clients': 
        case 'Bookings':
        case 'Visas':
        case 'Passports':
        case 'Policies':
            return <TableView data={filteredData} view={activeView} />;
        default: return <Typography>Select a view</Typography>;
    }
  };

  const TableView = React.memo(({ data, view }: { data: any[], view: string }) => (
    <Fade in={true}>
    <Paper sx={{ p: 2, mt: 2, elevation: 3, borderRadius: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>{view}</Typography>
        <TextField key={view} label="Search All Columns" variant="outlined" size="small" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }} sx={{minWidth: '300px'}} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenModal('add')}>Add {view.slice(0, -1)}</Button>
      </Box>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 250px)' }}>
        <Table stickyHeader aria-label={`${view} table`}>
          <TableHead>
            <TableRow>
              {Object.keys(getFieldsForView(view)).map(key => (
                <TableCell key={key} sortDirection={sortColumn === key ? sortDirection : false} sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>
                    <Tooltip title={`Sort by ${key.replace(/_/g, ' ')}`} enterDelay={300}>
                        <Typography onClick={() => handleSort(key)} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: 'inherit' }}>
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            {sortColumn === key && (sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
                        </Typography>
                    </Tooltip>
                </TableCell>
              ))}
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'action.hover' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map(item => (
              <TableRow hover key={item.id}>
                {Object.keys(getFieldsForView(view)).map(key => (
                  <TableCell key={key}>
                    {key.includes('date') && item[key] ? dayjs(item[key]).format('YYYY-MM-DD') : 
                     key === 'client_id' ? (clients.find(c => c.id === item[key])?.first_name || 'N/A') :
                     item[key]}
                  </TableCell>
                ))}
                <TableCell>
                  <Tooltip title="Edit"><IconButton size="small" onClick={() => handleOpenModal('edit', item)}><EditIcon color="info" /></IconButton></Tooltip>
                  <Tooltip title="Delete"><IconButton size="small" onClick={() => handleDeleteItem(item.id, view)}><DeleteIcon color="error" /></IconButton></Tooltip>
                  {view === 'Clients' && <Tooltip title="Documents"><IconButton size="small" onClick={() => handleOpenDocModal(item)}><DescriptionIcon color="primary" /></IconButton></Tooltip>}
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
                <TableRow><TableCell colSpan={Object.keys(getFieldsForView(view)).length + 1} align="center">No data available.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
    </Fade>
  ));
  TableView.displayName = 'TableView';

  const DashboardView = ({ stats, clientData, bookingData, policyData }: any) => {
    const nationalityData = useMemo(() => Object.entries(
        clientData.reduce((acc, c) => ({ ...acc, [c.nationality]: (acc[c.nationality] || 0) + 1 }), {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value })), [clientData]);
    const bookingsByMonthData = useMemo(() => {
        const counts = Array(12).fill(0).map((_, i) => ({ name: dayjs().month(i).format('MMM'), bookings: 0 }));
        bookingData.forEach((b: Booking) => { const m = dayjs(b.check_in).month(); if(m>=0) counts[m].bookings++; });
        return counts;
    }, [bookingData]);
    
    const topClientsByBookings = useMemo(() => {
        const bookingCounts = bookingData.reduce((acc, booking) => {
            acc[booking.client_id] = (acc[booking.client_id] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(bookingCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([clientId, count]) => ({
                name: clientData.find(c => c.id === clientId)?.first_name || 'Unknown',
                bookings: count,
            }));
    }, [bookingData, clientData]);
    
    const clientAgeData = useMemo(() => {
        const ageGroups = { '18-30': 0, '31-45': 0, '46-60': 0, '61+': 0, 'Unknown': 0 };
        clientData.forEach((c: Client) => {
            if (!c.dob) {
                ageGroups.Unknown++;
                return;
            }
            const age = dayjs().diff(c.dob, 'year');
            if (age <= 30) ageGroups['18-30']++;
            else if (age <= 45) ageGroups['31-45']++;
            else if (age <= 60) ageGroups['46-60']++;
            else ageGroups['61+']++;
        });
        return Object.entries(ageGroups).map(([name, value]) => ({ name, 'Number of Clients': value }));
    }, [clientData]);

    const popularDestinations = useMemo(() => {
        const destinationCounts = bookingData.reduce((acc, booking) => {
            const dest = booking.destination || 'N/A';
            acc[dest] = (acc[dest] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(destinationCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 7)
            .map(([name, value]) => ({ name, 'Bookings': value }));
    }, [bookingData]);

    const bookingTypeData = useMemo(() => {
        const typeCounts = bookingData.reduce((acc, booking) => {
            const type = booking.booking_type || 'Other';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
    }, [bookingData]);
    
    const avgTripDuration = useMemo(() => {
        const validTrips = bookingData.filter(b => b.check_in && b.check_out);
        if (validTrips.length === 0) return 0;
        const totalDays = validTrips.reduce((sum, b) => {
            const duration = dayjs(b.check_out).diff(dayjs(b.check_in), 'day');
            return sum + (duration > 0 ? duration : 0);
        }, 0);
        return Math.round(totalDays / validTrips.length);
    }, [bookingData]);
    
    return (
        <Fade in={true}>
        <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}><Paper sx={{p:2, textAlign:'center', elevation: 3, borderRadius: 2}}><Typography variant="h6">Total Clients</Typography><Typography variant="h4" color="primary.main" sx={{fontWeight: 'bold'}}>{stats.clients}</Typography></Paper></Grid>
            <Grid item xs={12} sm={6} md={3}><Paper sx={{p:2, textAlign:'center', elevation: 3, borderRadius: 2}}><Typography variant="h6">Active Bookings</Typography><Typography variant="h4" color="secondary.main" sx={{fontWeight: 'bold'}}>{stats.bookings}</Typography></Paper></Grid>
            <Grid item xs={12} sm={6} md={3}><Paper sx={{p:2, textAlign:'center', elevation: 3, borderRadius: 2}}><Typography variant="h6">Avg. Trip Duration</Typography><Typography variant="h4" color="info.main" sx={{fontWeight: 'bold'}}>{avgTripDuration} Days</Typography></Paper></Grid>
            <Grid item xs={12} sm={6} md={3}><Paper sx={{p:2, textAlign:'center', elevation: 3, borderRadius: 2}}><Typography variant="h6">Expiring Soon</Typography><Typography variant="h4" color="error.main" sx={{fontWeight: 'bold'}}>{reminders.filter((r: Reminder) => r.type !== 'Birthday' && r.days_left! <= 30 && r.days_left! >=0).length}</Typography></Paper></Grid>
            
            <Grid item xs={12} lg={8}><Paper sx={{p:2, height: 400, elevation: 3, borderRadius: 2}}>
                <Typography variant="h6" gutterBottom>Bookings Over Time</Typography>
                <ResponsiveContainer width="100%" height="90%"><LineChart data={bookingsByMonthData} margin={{top: 5, right: 20, left: 10, bottom: 5}}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><RechartsTooltip /><Legend /><Line type="monotone" dataKey="bookings" stroke="#8884d8" activeDot={{ r: 8 }} /></LineChart></ResponsiveContainer>
            </Paper></Grid>
            <Grid item xs={12} lg={4}><Paper sx={{ p: 2, height: 400, elevation: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>Client Nationality</Typography>
                <ResponsiveContainer width="100%" height="90%"><PieChart><Pie data={nationalityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label labelLine={false}>{nationalityData.map((e, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}</Pie><RechartsTooltip /><Legend layout="vertical" align="right" verticalAlign="middle" /></PieChart></ResponsiveContainer>
            </Paper></Grid>

             <Grid item xs={12} lg={8}><Paper sx={{p:2, height: 400, elevation: 3, borderRadius: 2}}>
                <Typography variant="h6" gutterBottom>Popular Destinations</Typography>
                <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={popularDestinations} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                         <CartesianGrid strokeDasharray="3 3" />
                         <XAxis type="number" allowDecimals={false} />
                         <YAxis type="category" dataKey="name" width={80} />
                         <RechartsTooltip />
                         <Legend />
                         <Bar dataKey="Bookings" fill="#00C49F" radius={[10, 10, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Paper></Grid>
            <Grid item xs={12} lg={4}><Paper sx={{ p: 2, height: 400, elevation: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>Booking Type</Typography>
                <ResponsiveContainer width="100%" height="90%"><PieChart><Pie data={bookingTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#FF8042" label labelLine={false}>{bookingTypeData.map((e, i) => <Cell key={`cell-${i}`} fill={COLORS.slice(2)[i % COLORS.slice(2).length]} />)}</Pie><RechartsTooltip /><Legend layout="vertical" align="right" verticalAlign="middle" /></PieChart></ResponsiveContainer>
            </Paper></Grid>

            <Grid item xs={12} lg={8}><Paper sx={{p:2, height: 400, elevation: 3, borderRadius: 2}}>
                <Typography variant="h6" gutterBottom>Client Age Distribution</Typography>
                <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={clientAgeData} margin={{top: 5, right: 20, left: 10, bottom: 5}}>
                         <CartesianGrid strokeDasharray="3 3" />
                         <XAxis dataKey="name" />
                         <YAxis allowDecimals={false}/>
                         <RechartsTooltip />
                         <Legend />
                         <Bar dataKey="Number of Clients" fill="#FFBB28" radius={[10, 10, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Paper></Grid>
             <Grid item xs={12} lg={4}><Paper sx={{ p: 2, height: 400, elevation: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>Top 5 Clients (by Bookings)</Typography>
                 <TableContainer sx={{ maxHeight: 320 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow><TableCell sx={{fontWeight: 'bold'}}>Client Name</TableCell><TableCell align="right" sx={{fontWeight: 'bold'}}>Bookings</TableCell></TableRow>
                        </TableHead>
                        <TableBody>
                            {topClientsByBookings.length > 0 ? (
                                topClientsByBookings.map((client) => (
                                    <TableRow key={client.name}>
                                        <TableCell>{client.name}</TableCell>
                                        <TableCell align="right">{String(client.bookings)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={2} align="center">No top clients yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper></Grid>
        </Grid>
        </Fade>
    );
  };
  
  const FormModal = () => {
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        setFormData(modalMode === 'edit' && selectedItem ? selectedItem : getFieldsForView(activeView));
    }, [openModal, modalMode, selectedItem, activeView]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>) => {
        const { name, value } = e.target as HTMLInputElement;
        setFormData({ ...formData, [name]: (e.target as HTMLInputElement).type === 'number' ? parseFloat(value) || 0 : value });
    };

    const handleDateChange = (key: string, date: dayjs.Dayjs | null) => {
        setFormData({ ...formData, [key]: date ? date.format('YYYY-MM-DD') : null });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modalMode === 'add') handleAddItem(formData);
        else handleUpdateItem(formData);
    };
    
    return (
        <Dialog open={openModal} onClose={handleCloseModal} maxWidth="sm" fullWidth>
            <DialogTitle>{modalMode === 'add' ? 'Add New' : 'Edit'} {activeView.slice(0, -1)}</DialogTitle>
            <form onSubmit={handleSubmit}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DialogContent dividers>
                        <Grid container spacing={2} sx={{pt: 1}}>
                        {Object.keys(formData).filter(k => k !== 'id' && k !== 'created_at').map(key => (
                            <Grid item xs={12} sm={key.includes('notes') || key.includes('special_requirement') ? 12 : 6} key={key}>
                                {key.includes('client_id') ? (
                                    <FormControl fullWidth required>
                                        <InputLabel id={`${key}-label`}>Client</InputLabel>
                                        <Select
                                            labelId={`${key}-label`}
                                            id={key}
                                            name="client_id"
                                            value={formData[key] || ''}
                                            label="Client"
                                            onChange={(e) => handleChange(e as any)}
                                        >
                                            <MenuItem value=""><em>None</em></MenuItem>
                                            {clients.map(c => <MenuItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                ) : key.includes('booking_id') && activeView === 'Policies' ? (
                                    <FormControl fullWidth required>
                                        <InputLabel id={`${key}-label`}>Booking</InputLabel>
                                        <Select
                                            labelId={`${key}-label`}
                                            id={key}
                                            name="booking_id"
                                            value={formData[key] || ''}
                                            label="Booking"
                                            onChange={(e) => handleChange(e as any)}
                                        >
                                            <MenuItem value=""><em>None</em></MenuItem>
                                            {bookings.map(b => <MenuItem key={b.id} value={b.id}>{b.pnr || b.reference} ({clients.find(c => c.id === b.client_id)?.first_name || 'N/A'})</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                ) : key.includes('date') || key.includes('dob') || key.includes('check_in') || key.includes('check_out') || key.includes('start_date') || key.includes('end_date') ? (
                                    <DatePicker
                                        label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        value={formData[key] ? dayjs(formData[key]) : null}
                                        onChange={(date) => handleDateChange(key, date)}
                                        slotProps={{ textField: { fullWidth: true, required: true } }}
                                    />
                                ) : (
                                    <TextField name={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        type={typeof (getFieldsForView(activeView) as any)[key] === 'number' ? 'number' : 'text'}
                                        fullWidth value={formData[key] || ''} onChange={handleChange} required={key !== 'notes' && key !== 'special_requirement'}
                                        multiline={key.includes('notes') || key.includes('special_requirement')}
                                        rows={key.includes('notes') || key.includes('special_requirement') ? 3 : 1}
                                    />
                                )}
                            </Grid>
                        ))}
                        </Grid>
                    </DialogContent>
                </LocalizationProvider>
                <DialogActions>
                    <Button onClick={handleCloseModal}>Cancel</Button>
                    <Button type="submit" variant="contained">{modalMode === 'add' ? 'Add' : 'Update'}</Button>
                </DialogActions>
            </form>
        </Dialog>
    )
  }

  const ConfirmationDialog = () => (
    <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs">
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent><Typography>Are you sure you want to delete this item? This action cannot be undone.</Typography></DialogContent>
        <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={executeDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
    </Dialog>
  );

  const DocumentUploadModal = () => {
    const [documents, setDocuments] = useState<ClientDocument[]>([]);
    const [uploading, setUploading] = useState(false);
    const [docError, setDocError] = useState<string | null>(null);

    const fetchDocuments = useCallback(async () => {
        if (!selectedClientForDocs) return;
        setDocError(null);
        const { data, error } = await supabase.from('client_documents').select('*').eq('client_id', selectedClientForDocs.id).order('created_at', { ascending: false });
        if (error) setDocError(error.message);
        else setDocuments(data || []);
    }, [selectedClientForDocs]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !selectedClientForDocs) return;
        const file = event.target.files[0];
        const filePath = `${selectedClientForDocs.id}/${Date.now()}_${file.name}`;
        
        setUploading(true);
        setDocError(null);

        const { error: uploadError } = await supabase.storage.from('client-documents').upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

        if (uploadError) {
            setDocError(`Upload failed: ${uploadError.message}`);
        } else {
            const { error: dbError } = await supabase.from('client_documents').insert({
                client_id: selectedClientForDocs.id,
                file_name: file.name,
                file_path: filePath,
            });
            if (dbError) setDocError(`Failed to save document record: ${dbError.message}`);
            else fetchDocuments();
        }
        setUploading(false);
    };

    const handleDeleteDoc = async (doc: ClientDocument) => {
        if (!window.confirm(`Are you sure you want to delete "${doc.file_name}"?`)) return;

        setDocError(null);
        const { error: storageError } = await supabase.storage.from('client-documents').remove([doc.file_path]);
        if (storageError) {
            setDocError(`Failed to delete file from storage: ${storageError.message}`);
            return;
        }
        const { error: dbError } = await supabase.from('client_documents').delete().eq('id', doc.id);
        if (dbError) setDocError(`Failed to delete document record: ${dbError.message}`);
        else fetchDocuments();
    }

  const handleViewOrDownload = async (doc: ClientDocument) => {
    setDocError(null);
    try {
        const { data, error } = supabase.storage.from('client-documents').getPublicUrl(doc.file_path);
        if (error) {
            setDocError(`Failed to get document URL: ${error.message}`);
            return;
        } else {  
            window.open(data.publicUrl, '_blank');
        }
    } catch (err: any) {
        setDocError(`An unexpected error occurred: ${err.message}`);
    }
};

    return (
        <Dialog open={docModalOpen} onClose={handleCloseDocModal} maxWidth="md" fullWidth>
            <DialogTitle>Documents for {selectedClientForDocs?.first_name} {selectedClientForDocs?.last_name}</DialogTitle>
            <DialogContent dividers>
                {docError && <Alert severity="error" sx={{mb: 2}}>{docError}</Alert>}
                <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                    <Button variant="contained" component="label" startIcon={<UploadFileIcon />} disabled={uploading}>
                        Upload File
                        <input type="file" hidden onChange={handleUpload} />
                    </Button>
                    {uploading && <CircularProgress size={24} />}
                </Stack>
                <List sx={{mt: 2, border: '1px solid #e0e0e0', borderRadius: 1, maxHeight: 300, overflowY: 'auto'}}>
                    {documents.length > 0 ? (
                        documents.map(doc => (
                            <ListItem key={doc.id} secondaryAction={
                                <>
                                    <Tooltip title="View/Download">
                                        <IconButton edge="end" aria-label="view-download" onClick={() => handleViewOrDownload(doc)} sx={{mr: 1}}>
                                            <DescriptionIcon color="primary" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                        <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteDoc(doc)}>
                                            <DeleteIcon color="error" />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            }>
                                <ListItemIcon><DescriptionIcon /></ListItemIcon>
                                <ListItemText primary={doc.file_name} secondary={`Uploaded: ${dayjs(doc.created_at).format('YYYY-MM-DD HH:mm')}`} />
                            </ListItem>
                        ))
                    ) : (
                        <ListItem><ListItemText sx={{ textAlign: 'center', py: 2 }} primary="No documents uploaded for this client." /></ListItem>
                    )}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCloseDocModal}>Close</Button>
            </DialogActions>
        </Dialog>
    )
  }

  const RightDrawer = ({ reminders, onReminderClick }: { reminders: Reminder[]; onReminderClick: (reminder: Reminder) => void; }) => {
    const getReminderIcon = (type: string) => ({ Birthday: <CakeIcon color="secondary" />, Passport: <CreditCardIcon color="error" />, Visa: <VpnKeyIcon color="error" />, Policy: <PolicyIcon color="error" />, Booking: <FlightIcon color="info" /> }[type] || <NotificationsIcon />);
    const getReminderMessage = (r: Reminder) => {
        let message = `${r.type} for ${r.name}`;
        if (r.type.includes('Passport') || r.type.includes('Visa') || r.type.includes('Policy')) {
            message += ` expiring on ${dayjs(r.expiry_date || r.end_date).format('YYYY-MM-DD')}`;
        } else if (r.type === 'Booking') {
            message += ` check-in on ${dayjs(r.departure_date).format('YYYY-MM-DD')}`;
        } else if (r.type === 'Birthday') {
            message += ` on ${dayjs(r.dob).format('MM-DD')}`;
        }
        if (r.days_left !== undefined && r.days_left >= 0) {
            message += ` (${r.days_left === 0 ? 'Today' : `in ${r.days_left} days`}).`;
        } else if (r.days_left !== undefined && r.days_left < 0) {
            message += ` (Expired ${Math.abs(r.days_left)} days ago).`;
        }
        return message;
    };

    const categorizedReminders = useMemo(() => {
      return reminders.reduce((acc, reminder) => {
        acc[reminder.type] = [...(acc[reminder.type] || []), reminder];
        return acc;
      }, {} as Record<string, Reminder[]>);
    }, [reminders]);

    return (
        <Drawer
            variant="permanent"
            anchor="right"
            sx={{
                width: rightDrawerWidth,
                flexShrink: 0,
                [`& .MuiDrawer-paper`]: { width: rightDrawerWidth, boxSizing: 'border-box', pt: '64px', overflowY: 'auto', borderLeft: '1px solid rgba(0, 0, 0, 0.12)' },
                display: { xs: 'none', md: 'block' }
            }}
        >
            <Toolbar />
            <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>Reminders</Typography>
                {Object.keys(categorizedReminders).length > 0 ? (
                    Object.entries(categorizedReminders).map(([category, items]) => (
                        <Accordion key={category} defaultExpanded={true} elevation={1} sx={{ mb: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                    {category} ({items.length})
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 1 }}>
                                {items.map((r, i) => (
                                    <Alert 
                                        key={i} 
                                        severity={r.days_left! <= 7 && r.days_left! >= 0 ? "error" : r.days_left! < 0 ? "error" : "warning"} 
                                        icon={getReminderIcon(r.type)} 
                                        sx={{ mb: 1, cursor: 'pointer', '&:last-child': { mb: 0 }, alignItems: 'center' }} 
                                        onClick={() => onReminderClick(r)}
                                    >
                                        {getReminderMessage(r)}
                                    </Alert>
                                ))}
                            </AccordionDetails>
                        </Accordion>
                    ))
                ) : (
                    <Alert severity="success" sx={{mt: 2}}>No upcoming reminders!</Alert>
                )}
            </Box>
        </Drawer>
    );
  };


  // --- MAIN RENDER ---
  if (!session) {
    return <AuthComponent setSession={setSession} />;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" 
        sx={{ 
            zIndex: (theme) => theme.zIndex.drawer + 1,
            // LAYOUT FIX: Removed width and margin calculations.
            // The AppBar will now span the full width of the viewport.
            // The drawers and main content area have their own <Toolbar /> component 
            // to offset their content, so they will appear correctly underneath 
            // the full-width AppBar. This simplifies the layout logic and resolves the gap issue.
        }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}><MenuIcon /></IconButton>
          <Typography variant="h6" noWrap component="div" sx={{flexGrow: 1}}>{activeView}</Typography>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}>{drawer}</Drawer>
        <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid rgba(0, 0, 0, 0.12)' } }} open>{drawer}</Drawer>
      </Box>
      <Box component="main" 
        sx={{ 
            flexGrow: 1, 
            p: 3, 
            bgcolor: '#f4f6f8', 
            minHeight: '100vh',
        }}>
        <Toolbar /> {/* Toolbar offset for content below AppBar */}
        <Container maxWidth="xl" sx={{ pt: 2, pb: 2 }}>
          {renderContent()}
        </Container>
      </Box>

      {/* Right Reminders Drawer */}
      <RightDrawer reminders={reminders} onReminderClick={handleReminderClick} />

      {openModal && <FormModal />}
      {docModalOpen && <DocumentUploadModal />}
      <ConfirmationDialog />
    </Box>
  );
}