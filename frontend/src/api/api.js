import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000', // update to your backend URL
});

export default api;
