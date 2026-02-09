// API client for backend communication
// TODO: Implement API client with fetch/axios


class APIClient {
  constructor() {
    this.baseURL = 'http://localhost:8000';
  }

  async searchManhwa(query, filters) {
    // TODO: Implement search
  }

  async getManhwaDetails(id) {
    // TODO: Implement get details
  }

  async getUserList(userId) {
    // TODO: Implement get user list
  }

  async compareWithList(manhwaId) {
    // TODO: Implement comparison
  }
}

export default new APIClient();
