import './App.css';
import React , {useContext} from 'react';
import Login from './components/Login';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import TaskManager from './components/TaskManager';
import { UserProvider , UserContext } from './context/UserContext';
import PrivateRoute from './components/PrivateRoute';
import ProductsView from './components/ProductsView';
import './i18n/i18n';
import Topbar from './components/TopBar';

// TODO Add translation

function App() {
  
  const { user } = useContext(UserContext);

  React.useEffect(() => {
    if (process.env.REACT_APP_NODE_ENV == 'prd') {
      console.log("executing Matomo");
      var _mtm = (window._mtm = window._mtm || []);
      _mtm.push({ 'mtm.startTime': new Date().getTime(), event: 'mtm.Start' });
      (function () {
        var d = document,
          g = d.createElement('script'),
          s = d.getElementsByTagName('script')[0];
        g.async = true;
        g.src =
          'https://analytics.comunitasolidali.it/js/container_v2cUbTWC.js';
        s.parentNode.insertBefore(g, s);
      })();
    }
  }, []);

  if(user.isLoggedIn){

    return (
      <UserProvider>
        <Router>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <Login />
                  <ProductsView />
                </>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute roles={['admin']}>
                  <TaskManager />
                </PrivateRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <PrivateRoute roles={['admin']}>
                  <TaskManager />
                </PrivateRoute>
              }
            />
            <Route path="/unauth" element={<div>Unauthorized</div>} />
          </Routes>
        </Router>
      </UserProvider>
    );

  } else {

    return (
      <UserProvider>
        <Router>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <Topbar />
                  <ProductsView />
                </>
              }
            />
            <Route
              path="/login"
              element={
                <>
                  <Login />
                </>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute roles={['admin']}>
                  <TaskManager />
                </PrivateRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <PrivateRoute roles={['admin']}>
                  <TaskManager />
                </PrivateRoute>
              }
            />
          </Routes>
        </Router>
      </UserProvider>
    );
          
  }

}

export default App;
