import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import NameEntry from './pages/NameEntry';
import Lobby from './pages/Lobby';
import GamePage from './pages/GamePage';
import ResultPage from './pages/ResultPage';

export default function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Home/>} />
        <Route path='/names' element={<NameEntry/>} />
        <Route path='/lobby' element={<Lobby/>} />
        <Route path='/game' element={<GamePage/>} />
        <Route path='/result' element={<ResultPage/>} />
      </Routes>
    </BrowserRouter>
  );
}
