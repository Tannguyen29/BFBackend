const Notification = require('../models/notification');
const User = require('../models/user');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      recipient: req.user.userId,
      read: false 
    })
    .populate('student', 'name email personalInfo avatarUrl')
    .sort('-createdAt');

    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { 
        recipient: req.user.userId,
        read: false 
      },
      { read: true }
    );

    await User.findByIdAndUpdate(
      req.user.userId,
      { hasUnreadNotification: false }
    );

    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Error marking notifications as read' });
  }
};

exports.getStudentDetails = async (req, res) => {
  try {
    const student = await User.findById(req.params.studentId)
      .select('name email personalInfo avatarUrl');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ student });
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ message: 'Error fetching student details' });
  }
}; 