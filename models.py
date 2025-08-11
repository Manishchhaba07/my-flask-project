from datetime import datetime
from app import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    full_name = db.Column(db.String(200), nullable=False)
    college = db.Column(db.String(200), nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    bio = db.Column(db.Text, nullable=True)
    skills = db.Column(db.Text, nullable=True)
    profile_image = db.Column(db.Text, nullable=True)  # Store base64 image or URL
    phone = db.Column(db.String(20), nullable=True)
    location = db.Column(db.String(200), nullable=True)
    title = db.Column(db.String(200), nullable=True)
    twitter = db.Column(db.String(255), nullable=True)
    linkedin = db.Column(db.String(255), nullable=True)
    github = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    projects = db.relationship('Project', backref='owner', lazy=True, cascade='all, delete-orphan')
    comments = db.relationship('Comment', backref='author', lazy=True, cascade='all, delete-orphan')
    votes = db.relationship('Vote', backref='user', lazy=True, cascade='all, delete-orphan')
    collaborations = db.relationship('Collaboration', backref='collaborator', lazy=True, cascade='all, delete-orphan')
    donations = db.relationship('Donation', backref='donor', lazy=True, cascade='all, delete-orphan')
    discussions = db.relationship('Discussion', backref='author', lazy=True, cascade='all, delete-orphan')
    discussion_replies = db.relationship('DiscussionReply', backref='author', lazy=True, cascade='all, delete-orphan')
    discussion_likes = db.relationship('DiscussionLike', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'college': self.college,
            'bio': self.bio,
            'skills': self.skills,
            'profile_image': self.profile_image,
            'phone': self.phone,
            'location': self.location,
            'title': self.title,
            'twitter': self.twitter,
            'linkedin': self.linkedin,
            'github': self.github,
            'created_at': self.created_at.isoformat()
        }

class Project(db.Model):
    __tablename__ = 'projects'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=False)
    funding_goal = db.Column(db.Float, default=0.0)
    current_funding = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(50), default='active')  # active, completed, paused
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Relationships
    comments = db.relationship('Comment', backref='project', lazy=True, cascade='all, delete-orphan')
    votes = db.relationship('Vote', backref='project', lazy=True, cascade='all, delete-orphan')
    collaborations = db.relationship('Collaboration', backref='project', lazy=True, cascade='all, delete-orphan')
    donations = db.relationship('Donation', backref='project', lazy=True, cascade='all, delete-orphan')
    attachments = db.relationship('ProjectAttachment', backref='project', lazy=True, cascade='all, delete-orphan')
    
    def get_vote_count(self):
        return Vote.query.filter_by(project_id=self.id, is_upvote=True).count()
    
    def get_collaboration_count(self):
        return Collaboration.query.filter_by(project_id=self.id).count()
    
    def get_comment_count(self):
        return Comment.query.filter_by(project_id=self.id).count()
    
    def to_dict(self, current_user_id=None):
        owner_data = None
        if hasattr(self, 'owner') and self.owner:
            owner_data = self.owner.to_dict()
        
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'funding_goal': self.funding_goal,
            'current_funding': self.current_funding,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'owner': owner_data,
            'vote_count': self.get_vote_count(),
            'collaboration_count': self.get_collaboration_count(),
            'comment_count': self.get_comment_count(),
            'attachments': [attachment.to_dict() for attachment in self.attachments] if hasattr(self, 'attachments') else [],
            'can_edit': current_user_id == self.user_id if current_user_id else False
        }

class Comment(db.Model):
    __tablename__ = 'comments'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    
    def get_reaction_count(self, reaction_type):
        """Get count of reactions of specific type for this comment"""
        return len([r for r in self.reactions if r.reaction_type == reaction_type])
    
    def get_user_reaction(self, user_id):
        """Get user's reaction type on this comment (if any)"""
        for reaction in self.reactions:
            if reaction.user_id == user_id:
                return reaction.reaction_type
        return None
    
    def to_dict(self, user_id=None):
        author_data = None
        if hasattr(self, 'author') and self.author:
            author_data = self.author.to_dict()
            
        result = {
            'id': self.id,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if hasattr(self, 'updated_at') and self.updated_at else self.created_at.isoformat(),
            'author': author_data,
            'like_count': self.get_reaction_count('like'),
            'heart_count': self.get_reaction_count('heart'),
            'can_edit': user_id == self.user_id if user_id else False
        }
        
        # Include user's current reaction if user_id provided
        if user_id:
            result['user_reaction'] = self.get_user_reaction(user_id)
            
        return result

class Vote(db.Model):
    __tablename__ = 'votes'
    
    id = db.Column(db.Integer, primary_key=True)
    is_upvote = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    
    # Ensure one vote per user per project
    __table_args__ = (db.UniqueConstraint('user_id', 'project_id', name='unique_user_project_vote'),)

class Collaboration(db.Model):
    __tablename__ = 'collaborations'
    
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default='pending')  # pending, accepted, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    
    # Ensure one collaboration request per user per project
    __table_args__ = (db.UniqueConstraint('user_id', 'project_id', name='unique_user_project_collab'),)
    
    def to_dict(self):
        collaborator_data = None
        if hasattr(self, 'collaborator') and self.collaborator:
            collaborator_data = self.collaborator.to_dict()
            
        return {
            'id': self.id,
            'message': self.message,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'collaborator': collaborator_data
        }

class Donation(db.Model):
    __tablename__ = 'donations'
    
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    
    def to_dict(self):
        donor_data = None
        if hasattr(self, 'donor') and self.donor:
            donor_data = self.donor.to_dict()
            
        return {
            'id': self.id,
            'amount': self.amount,
            'message': self.message,
            'created_at': self.created_at.isoformat(),
            'donor': donor_data
        }

class Discussion(db.Model):
    __tablename__ = 'discussions'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=False)
    tags = db.Column(db.Text, nullable=True)  # Store as comma-separated string
    media_type = db.Column(db.String(20), nullable=True)  # 'image', 'video', or None
    media_url = db.Column(db.Text, nullable=True)  # Store base64 data or URL
    media_filename = db.Column(db.String(255), nullable=True)  # Original filename
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Relationships
    replies = db.relationship('DiscussionReply', backref='discussion', lazy=True, cascade='all, delete-orphan')
    likes = db.relationship('DiscussionLike', backref='discussion', lazy=True, cascade='all, delete-orphan')
    
    def get_like_count(self):
        return DiscussionLike.query.filter_by(discussion_id=self.id).count()
    
    def get_reply_count(self):
        return DiscussionReply.query.filter_by(discussion_id=self.id).count()
    
    def is_liked_by_user(self, user_id):
        return DiscussionLike.query.filter_by(discussion_id=self.id, user_id=user_id).first() is not None
    
    def to_dict(self, current_user_id=None):
        tags_list = [tag.strip() for tag in self.tags.split(',')] if self.tags else []
        author_data = None
        if hasattr(self, 'author') and self.author:
            author_data = self.author.to_dict()
            
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'category': self.category,
            'tags': tags_list,
            'media_type': self.media_type,
            'media_url': self.media_url,
            'media_filename': self.media_filename,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'author': author_data,
            'like_count': self.get_like_count(),
            'reply_count': self.get_reply_count(),
            'is_liked': self.is_liked_by_user(current_user_id) if current_user_id else False,
            'likes': self.get_like_count(),
            'replies': self.get_reply_count(),
            'can_edit': current_user_id == self.user_id if current_user_id else False
        }

class DiscussionReply(db.Model):
    __tablename__ = 'discussion_replies'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    discussion_id = db.Column(db.Integer, db.ForeignKey('discussions.id'), nullable=False)
    parent_reply_id = db.Column(db.Integer, db.ForeignKey('discussion_replies.id'), nullable=True)  # For nested replies
    
    # Relationships
    reactions = db.relationship('ReplyReaction', backref='reply', lazy=True, cascade='all, delete-orphan')
    nested_replies = db.relationship('DiscussionReply', backref=db.backref('parent_reply', remote_side=[id]), lazy=True)
    
    def get_reaction_count(self, reaction_type):
        return ReplyReaction.query.filter_by(reply_id=self.id, reaction_type=reaction_type).count()
    
    def is_reacted_by_user(self, user_id, reaction_type):
        return ReplyReaction.query.filter_by(reply_id=self.id, user_id=user_id, reaction_type=reaction_type).first() is not None
    
    def to_dict(self, current_user_id=None):
        author_data = None
        if hasattr(self, 'author') and self.author:
            author_data = self.author.to_dict()
            
        # Handle nested replies safely
        nested_replies_list = []
        try:
            if hasattr(self, 'nested_replies') and self.nested_replies:
                nested_replies_list = [nested.to_dict(current_user_id) for nested in self.nested_replies]
        except Exception:
            nested_replies_list = []
            
        return {
            'id': self.id,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if hasattr(self, 'updated_at') and self.updated_at else self.created_at.isoformat(),
            'author': author_data,
            'likes': self.get_reaction_count('like'),
            'hearts': self.get_reaction_count('heart'),
            'parent_reply_id': self.parent_reply_id,
            'nested_replies': nested_replies_list,
            'can_edit': current_user_id == self.user_id if current_user_id else False,
            'user_reactions': {
                'like': self.is_reacted_by_user(current_user_id, 'like') if current_user_id else False,
                'heart': self.is_reacted_by_user(current_user_id, 'heart') if current_user_id else False,
            } if current_user_id else {}
        }

class DiscussionLike(db.Model):
    __tablename__ = 'discussion_likes'
    
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    discussion_id = db.Column(db.Integer, db.ForeignKey('discussions.id'), nullable=False)
    
    # Ensure one like per user per discussion
    __table_args__ = (db.UniqueConstraint('user_id', 'discussion_id', name='unique_user_discussion_like'),)

class ReplyReaction(db.Model):
    __tablename__ = 'reply_reactions'
    
    id = db.Column(db.Integer, primary_key=True)
    reaction_type = db.Column(db.String(20), nullable=False)  # 'like', 'heart'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reply_id = db.Column(db.Integer, db.ForeignKey('discussion_replies.id'), nullable=False)
    
    # Ensure one reaction per user per reply per type
    __table_args__ = (db.UniqueConstraint('user_id', 'reply_id', 'reaction_type', name='unique_user_reply_reaction'),)

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)  # comment, like, collaboration, donation, etc.
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # recipient
    related_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # actor (who caused the notification)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True)
    
    # Relationships
    recipient = db.relationship('User', foreign_keys=[user_id], backref='received_notifications')
    actor = db.relationship('User', foreign_keys=[related_user_id], backref='sent_notifications')
    related_project = db.relationship('Project', backref='notifications')
    
    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat(),
            'actor': self.actor.to_dict() if self.actor else None,
            'project': self.related_project.to_dict() if self.related_project else None
        }

class CommentReaction(db.Model):
    __tablename__ = 'comment_reactions'
    
    id = db.Column(db.Integer, primary_key=True)
    reaction_type = db.Column(db.String(20), nullable=False)  # 'like', 'heart'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    comment_id = db.Column(db.Integer, db.ForeignKey('comments.id'), nullable=False)
    
    # Relationships
    user = db.relationship('User', backref='comment_reactions')
    comment = db.relationship('Comment', backref='reactions')
    
    # Ensure one reaction per user per comment (they can change reaction type)
    __table_args__ = (db.UniqueConstraint('user_id', 'comment_id', name='unique_user_comment_reaction'),)

class CommentReply(db.Model):
    __tablename__ = 'comment_replies'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    comment_id = db.Column(db.Integer, db.ForeignKey('comments.id'), nullable=False)
    
    # Relationships
    author = db.relationship('User', backref='comment_replies')
    comment = db.relationship('Comment', backref='replies')
    
    def to_dict(self):
        author_data = None
        if hasattr(self, 'author') and self.author:
            author_data = self.author.to_dict()
            
        return {
            'id': self.id,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
            'author': author_data
        }


# Project Attachment model for file uploads
class ProjectAttachment(db.Model):
    __tablename__ = 'project_attachments'
    
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)  # Size in bytes
    file_type = db.Column(db.String(100), nullable=False)  # MIME type
    file_path = db.Column(db.String(500), nullable=False)  # Path to stored file
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_size': self.file_size,
            'file_type': self.file_type,
            'uploaded_at': self.uploaded_at.isoformat(),
            'user_id': self.user_id
        }


class TeamChat(db.Model):
    __tablename__ = 'team_chats'
    
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Relationships
    project = db.relationship('Project', backref='chat_messages')
    author = db.relationship('User', backref='chat_messages')
    
    def to_dict(self):
        return {
            'id': self.id,
            'message': self.message,
            'created_at': self.created_at.isoformat(),
            'author': self.author.to_dict() if hasattr(self, 'author') and self.author else None
        }
