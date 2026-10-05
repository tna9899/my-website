/**
 * CẤU HÌNH ĐỒNG BỘ ĐA THIẾT BỊ (MÁY TÍNH ⇄ ĐIỆN THOẠI)
 * -------------------------------------------------------------------------
 * Website hoạt động trên GitHub Pages với 2 lớp đồng bộ dữ liệu thời gian thực:
 *
 * 1. ĐỒNG BỘ ĐÁM MÂY TỰ ĐỘNG (IMAGEKIT CLOUD SYNC) - 100% MIỄN PHÍ:
 *    - Sử dụng dịch vụ ImageKit đã cấu hình sẵn trong `imagekit-config.js`.
 *    - Mọi ảnh kỷ niệm và dữ liệu thêm/sửa/xóa trên máy tính sẽ lập tức xuất hiện
 *      trên điện thoại và ngược lại mà KHÔNG CẦN BƯỚC CẤU HÌNH PHỨC TẠP NÀO!
 *
 * 2. ĐỒNG BỘ MÃ NGUỒN GITHUB REPO (TÙY CHỌN NÂNG CAO):
 *    - Dành cho bạn nếu muốn lưu thẳng file `memories.json` vào commit GitHub.
 *    - Tạo Personal Access Token tại https://github.com/settings/tokens/new
 *    - Chọn quyền: `repo`
 *    - Dán mã token vào biến token bên dưới hoặc trong mục "Cài Đặt" trên web.
 * -------------------------------------------------------------------------
 */

const githubSyncConfig = {
    // Cấu hình GitHub Repository
    owner: "tna9899",
    repo: "my-website",
    branch: "main",
    filePath: "memories.json",
    // Token GitHub (Tùy chọn - có thể dán vào đây hoặc nhập trên giao diện Cài Đặt)
    token: "",

    // Cấu hình ImageKit Cloud Sync (Tự động 2 chiều tức thì)
    imageKitJsonUrl: "https://ik.imagekit.io/anhuyen/anhuyen_sync/memories_cloud.json",
    imageKitUploadEndpoint: "https://upload.imagekit.io/api/v1/files/upload"
};

// Đảm bảo gắn vào window cho toàn bộ ứng dụng truy cập
window.githubSyncConfig = githubSyncConfig;

// Hàm lấy token từ cấu hình file hoặc từ bộ nhớ trình duyệt
window.getGitHubSyncToken = function() {
    const localToken = localStorage.getItem('weddingGitHubToken');
    if (localToken && localToken.trim().length > 10) return localToken.trim();
    if (githubSyncConfig.token && githubSyncConfig.token.trim().length > 10) return githubSyncConfig.token.trim();
    return '';
};

window.isGitHubSyncConfigured = function() {
    return Boolean(window.getGitHubSyncToken());
};
