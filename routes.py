import os
from datetime import datetime
from flask import request, jsonify, send_from_directory, session
from app import app, db
from models import User, Project, Comment, Vote, Collaboration, Donation, Discussion, DiscussionReply, DiscussionLike, ReplyReaction, Notification, TeamChat, CommentReaction, ProjectAttachment
from sqlalchemy import desc, func

# Helper function to create notifications
def create_notification(user_id, type, title, message, related_user_id=None, project_id=None):
    try:
        notification = Notification()
        notification.user_id = user_id
        notification.type = type
        notification.title = title
        notification.message = message
        notification.related_user_id = related_user_id
        notification.project_id = project_id
        db.session.add(notification)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error creating notification: {e}")

# Serve static HTML files
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/login.html')
def login_page():
    return send_from_directory('static', 'login.html')

@app.route('/register.html')
def register_page():
    return send_from_directory('static', 'register.html')

@app.route('/dashboard.html')
def dashboard_page():
    return send_from_directory('static', 'dashboard.html')

@app.route('/browse.html')
def browse_page():
    return send_from_directory('static', 'browse.html')

@app.route('/discussion.html')
def discussion_page():
    return send_from_directory('static', 'discussion.html')

@app.route('/profile.html')
def profile_page():
    return send_from_directory('static', 'profile.html')

@app.route('/donate.html')
def donate_page():
    return send_from_directory('static', 'donate.html')

# Serve CSS and JS files
@app.route('/styles.css')
def styles():
    return send_from_directory('static', 'styles.css')

@app.route('/login.css')
def login_css():
    return send_from_directory('static', 'login.css')

@app.route('/register.css')
def register_css():
    return send_from_directory('static', 'register.css')

@app.route('/dashboard.css')
def dashboard_css():
    return send_from_directory('static', 'dashboard.css')

@app.route('/browse.css')
def browse_css():
    return send_from_directory('static', 'browse.css')

@app.route('/discussion.css')
def discussion_css():
    return send_from_directory('static', 'discussion.css')

@app.route('/profile.css')
def profile_css():
    return send_from_directory('static', 'profile.css')

@app.route('/donate.css')
def donate_css():
    return send_from_directory('static', 'donate.css')

@app.route('/js/<path:filename>')
def js_files(filename):
    return send_from_directory('static/js', filename)

# Authentication APIs
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'fullName', 'college', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if user already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create new user
        user = User()
        user.username = data['username']
        user.email = data['email']
        user.full_name = data['fullName']
        user.college = data['college']
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        # Set session
        session['user_id'] = user.id
        session['username'] = user.username
        
        return jsonify({
            'message': 'Registration successful',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Username and password are required'}), 400
        
        user = User.query.filter_by(username=data['username']).first()
        
        if user and user.check_password(data['password']):
            session['user_id'] = user.id
            session['username'] = user.username
            
            return jsonify({
                'message': 'Login successful',
                'user': user.to_dict()
            }), 200
        else:
            return jsonify({'error': 'Invalid username or password'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logout successful'}), 200

@app.route('/api/user', methods=['GET'])
def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()}), 200

# Project APIs
@app.route('/api/projects', methods=['GET'])
def get_projects():
    try:
        # Get query parameters
        sort_by = request.args.get('sort', 'recent')  # recent, popular, funding
        category = request.args.get('category', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        
        # Build query
        query = Project.query
        
        if category:
            query = query.filter(Project.category == category)
        
        # Apply sorting
        if sort_by == 'popular':
            # Sort by vote count (subquery)
            vote_counts = db.session.query(
                Vote.project_id,
                func.count(Vote.id).label('vote_count')
            ).filter(Vote.is_upvote == True).group_by(Vote.project_id).subquery()
            
            query = query.outerjoin(vote_counts, Project.id == vote_counts.c.project_id)\
                         .order_by(desc(vote_counts.c.vote_count))
        elif sort_by == 'funding':
            query = query.order_by(desc(Project.current_funding))
        else:  # recent
            query = query.order_by(desc(Project.created_at))
        
        # Paginate
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        user_id = session.get('user_id')
        projects = [project.to_dict(user_id) for project in paginated.items]
        
        return jsonify({
            'projects': projects,
            'total': paginated.total,
            'pages': paginated.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects', methods=['POST'])
def create_project():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Handle both JSON and multipart form data
        if request.is_json:
            data = request.get_json()
            files = []
        else:
            data = request.form.to_dict()
            files = request.files.getlist('files')
        
        # Validate required fields
        required_fields = ['title', 'description', 'category']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate minimum word count for description
        description_words = data['description'].strip().split()
        if len(description_words) < 50:
            return jsonify({'error': 'Project description must be at least 50 words. Please provide more details about your project idea.'}), 400
        
        project = Project()
        project.title = data['title']
        project.description = data['description']
        project.category = data['category']
        project.funding_goal = float(data.get('fundingGoal', 0))
        project.user_id = user_id
        
        db.session.add(project)
        db.session.flush()  # Get project ID without committing
        
        # Handle file uploads
        if files:
            import os
            from werkzeug.utils import secure_filename
            
            # Create uploads directory if it doesn't exist
            upload_dir = os.path.join('static', 'uploads', 'projects', str(project.id))
            os.makedirs(upload_dir, exist_ok=True)
            
            for file in files:
                if file and file.filename:
                    # Secure the filename
                    filename = secure_filename(file.filename)
                    timestamp = str(int(datetime.now().timestamp()))
                    unique_filename = f"{timestamp}_{filename}"
                    
                    # Save the file
                    file_path = os.path.join(upload_dir, unique_filename)
                    file.save(file_path)
                    
                    # Create attachment record
                    attachment = ProjectAttachment()
                    attachment.filename = unique_filename
                    attachment.original_filename = file.filename
                    attachment.file_size = os.path.getsize(file_path)
                    attachment.file_type = file.content_type or 'application/octet-stream'
                    attachment.file_path = file_path.replace('static/', '')  # Store relative path
                    attachment.project_id = project.id
                    attachment.user_id = user_id
                    
                    db.session.add(attachment)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Project created successfully',
            'project': project.to_dict(user_id)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        project = Project.query.get_or_404(project_id)
        
        # Check if user owns the project
        if project.user_id != user_id:
            return jsonify({'error': 'Permission denied'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'description', 'category']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Update project fields
        project.title = data['title']
        project.description = data['description']
        project.category = data['category']
        project.funding_goal = float(data.get('fundingGoal', project.funding_goal))
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Project updated successfully',
            'project': project.to_dict(user_id)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        project = Project.query.get_or_404(project_id)
        
        # Check if user owns the project
        if project.user_id != user_id:
            return jsonify({'error': 'Permission denied'}), 403
        
        # Delete associated files
        import os
        upload_dir = os.path.join('static', 'uploads', 'projects', str(project.id))
        if os.path.exists(upload_dir):
            import shutil
            shutil.rmtree(upload_dir)
        
        db.session.delete(project)
        db.session.commit()
        
        return jsonify({'message': 'Project deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# Serve uploaded files
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory('static/uploads', filename)

@app.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    try:
        user_id = session.get('user_id')
        project = Project.query.get_or_404(project_id)
        return jsonify({'project': project.to_dict(user_id)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Vote APIs
@app.route('/api/projects/<int:project_id>/vote', methods=['POST'])
def vote_project(project_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        project = Project.query.get_or_404(project_id)
        
        # Check if user already voted
        existing_vote = Vote.query.filter_by(user_id=user_id, project_id=project_id).first()
        
        if existing_vote:
            # Toggle vote or remove it
            if existing_vote.is_upvote:
                db.session.delete(existing_vote)
                action = 'removed'
            else:
                existing_vote.is_upvote = True
                action = 'updated'
        else:
            # Create new upvote
            vote = Vote()
            vote.user_id = user_id
            vote.project_id = project_id
            vote.is_upvote = True
            db.session.add(vote)
            action = 'added'
            
            # Create notification for project owner (only for new votes)
            voter = User.query.get(user_id)
            if voter and project.user_id != user_id:
                create_notification(
                    user_id=project.user_id,
                    type='vote',
                    title='Project Liked',
                    message=f'{voter.full_name} liked your project "{project.title}"',
                    related_user_id=user_id,
                    project_id=project.id
                )
        
        db.session.commit()
        
        return jsonify({
            'message': f'Vote {action} successfully',
            'vote_count': project.get_vote_count()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Comment APIs
@app.route('/api/projects/<int:project_id>/comments', methods=['GET'])
def get_comments(project_id):
    try:
        user_id = session.get('user_id')  # Get current user for reaction info
        comments = Comment.query.filter_by(project_id=project_id)\
                               .order_by(desc(Comment.created_at)).all()
        return jsonify({
            'comments': [comment.to_dict(user_id) for comment in comments]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>/comments', methods=['POST'])
def add_comment(project_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json()
        if not data.get('content'):
            return jsonify({'error': 'Content is required'}), 400
        
        comment = Comment()
        comment.content = data['content']
        comment.user_id = user_id
        comment.project_id = project_id
        
        db.session.add(comment)
        db.session.commit()
        
        # Create notification for project owner
        project = Project.query.get(project_id)
        commenter = User.query.get(user_id)
        if project and commenter and project.user_id != user_id:
            create_notification(
                user_id=project.user_id,
                type='comment',
                title='New Comment',
                message=f'{commenter.full_name} commented on your project "{project.title}"',
                related_user_id=user_id,
                project_id=project.id
            )
        
        return jsonify({
            'message': 'Comment added successfully',
            'comment': comment.to_dict(user_id)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/comments/<int:comment_id>', methods=['PUT'])
def update_comment(comment_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        comment = Comment.query.get_or_404(comment_id)
        
        # Check if user owns the comment
        if comment.user_id != user_id:
            return jsonify({'error': 'Permission denied'}), 403
        
        data = request.get_json()
        content = data.get('content', '').strip()
        
        if not content:
            return jsonify({'error': 'Comment content is required'}), 400
        
        comment.content = content
        comment.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Comment updated successfully',
            'comment': comment.to_dict(user_id)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/comments/<int:comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        comment = Comment.query.get_or_404(comment_id)
        
        # Check if user owns the comment
        if comment.user_id != user_id:
            return jsonify({'error': 'Permission denied'}), 403
        
        db.session.delete(comment)
        db.session.commit()
        
        return jsonify({'message': 'Comment deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Comment reaction APIs (for project comments)
@app.route('/api/comment/<int:comment_id>/reaction', methods=['POST'])
def toggle_comment_reaction(comment_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json()
        reaction_type = data.get('reaction_type')
        
        if reaction_type not in ['like', 'heart']:
            return jsonify({'error': 'Invalid reaction type'}), 400
        
        comment = Comment.query.get_or_404(comment_id)
        
        # Check if user already has any reaction on this comment
        existing_reaction = CommentReaction.query.filter_by(user_id=user_id, comment_id=comment_id).first()
        
        if existing_reaction:
            if existing_reaction.reaction_type == reaction_type:
                # Same reaction - remove it
                db.session.delete(existing_reaction)
                user_reacted = False
                action = 'removed'
            else:
                # Different reaction - change it
                existing_reaction.reaction_type = reaction_type
                user_reacted = True
                action = 'changed'
        else:
            # No existing reaction - add new one
            reaction = CommentReaction()
            reaction.user_id = user_id
            reaction.comment_id = comment_id
            reaction.reaction_type = reaction_type
            db.session.add(reaction)
            user_reacted = True
            action = 'added'
        
        db.session.commit()
        
        return jsonify({
            'message': f'Reaction {action} successfully',
            'like_count': comment.get_reaction_count('like'),
            'heart_count': comment.get_reaction_count('heart'),
            'user_reaction': comment.get_user_reaction(user_id)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



# Collaboration APIs
@app.route('/api/projects/<int:project_id>/collaborate', methods=['POST'])
def request_collaboration(project_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        project = Project.query.get_or_404(project_id)
        
        # Check if user is project owner
        if project.user_id == user_id:
            return jsonify({'error': 'Cannot collaborate on your own project'}), 400
        
        # Check if collaboration request already exists
        existing_collab = Collaboration.query.filter_by(
            user_id=user_id, project_id=project_id
        ).first()
        
        if existing_collab:
            return jsonify({'error': 'Collaboration request already exists'}), 400
        
        data = request.get_json()
        collaboration = Collaboration()
        collaboration.user_id = user_id
        collaboration.project_id = project_id
        collaboration.message = data.get('message', '')
        
        db.session.add(collaboration)
        db.session.commit()
        
        # Create notification for project owner
        requester = User.query.get(user_id)
        if requester:
            create_notification(
                user_id=project.user_id,
                type='collaboration',
                title='New Collaboration Request',
                message=f'{requester.full_name} wants to collaborate on "{project.title}"',
                related_user_id=user_id,
                project_id=project.id
            )
        
        return jsonify({
            'message': 'Collaboration request sent successfully',
            'collaboration': collaboration.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Donation APIs
@app.route('/api/projects/<int:project_id>/donate', methods=['POST'])
def donate_to_project(project_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        project = Project.query.get_or_404(project_id)
        data = request.get_json()
        
        amount = float(data.get('amount', 0))
        if amount <= 0:
            return jsonify({'error': 'Invalid donation amount'}), 400
        
        donation = Donation()
        donation.user_id = user_id
        donation.project_id = project_id
        donation.amount = amount
        donation.message = data.get('message', '')
        
        # Update project funding
        project.current_funding += amount
        
        db.session.add(donation)
        db.session.commit()
        
        # Create notification for project owner
        donor = User.query.get(user_id)
        if donor and project.user_id != user_id:
            create_notification(
                user_id=project.user_id,
                type='donation',
                title='New Donation Received',
                message=f'{donor.full_name} donated ${amount:.2f} to your project "{project.title}"',
                related_user_id=user_id,
                project_id=project.id
            )
        
        return jsonify({
            'message': 'Donation successful',
            'donation': donation.to_dict(),
            'new_funding': project.current_funding
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Dashboard APIs
@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        user_projects = Project.query.filter_by(user_id=user_id).all()
        total_funding = sum(project.current_funding for project in user_projects)
        total_votes = sum(project.get_vote_count() for project in user_projects)
        total_collaborations = Collaboration.query.filter_by(user_id=user_id).count()
        
        return jsonify({
            'total_projects': len(user_projects),
            'total_funding': total_funding,
            'total_votes': total_votes,
            'total_collaborations': total_collaborations,
            'projects': [project.to_dict() for project in user_projects]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Discussion APIs
@app.route('/api/discussions', methods=['GET'])
def get_discussions():
    try:
        # Get query parameters
        sort_by = request.args.get('sort', 'recent')  # recent, popular
        category = request.args.get('category', '')
        search = request.args.get('search', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        
        # Build query
        query = Discussion.query
        
        if category:
            query = query.filter(Discussion.category == category)
        
        if search:
            query = query.filter(Discussion.title.contains(search) | Discussion.content.contains(search))
        
        # Apply sorting
        if sort_by == 'popular':
            # Sort by like count (subquery)
            like_counts = db.session.query(
                DiscussionLike.discussion_id,
                func.count(DiscussionLike.id).label('like_count')
            ).group_by(DiscussionLike.discussion_id).subquery()
            
            query = query.outerjoin(like_counts, Discussion.id == like_counts.c.discussion_id)\
                         .order_by(desc(like_counts.c.like_count))
        else:  # recent
            query = query.order_by(desc(Discussion.created_at))
        
        # Paginate
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        user_id = session.get('user_id')
        discussions = [discussion.to_dict(user_id) for discussion in paginated.items]
        
        return jsonify({
            'discussions': discussions,
            'total': paginated.total,
            'pages': paginated.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/discussions/<int:discussion_id>/like', methods=['POST'])
def toggle_discussion_like(discussion_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        user_id = session['user_id']
        
        # Check if user already liked this discussion
        existing_like = DiscussionLike.query.filter_by(
            discussion_id=discussion_id,
            user_id=user_id
        ).first()
        
        if existing_like:
            # Unlike - remove the like
            db.session.delete(existing_like)
            liked = False
        else:
            # Like - add new like
            new_like = DiscussionLike(
                discussion_id=discussion_id,
                user_id=user_id
            )
            db.session.add(new_like)
            liked = True
            
            # Create notification for discussion owner
            discussion = Discussion.query.get(discussion_id)
            liker = User.query.get(user_id)
            if discussion and liker and discussion.user_id != user_id:
                create_notification(
                    user_id=discussion.user_id,
                    type='like',
                    title='Discussion Liked',
                    message=f'{liker.full_name} liked your discussion "{discussion.title}"',
                    related_user_id=user_id,
                    project_id=None
                )
        
        db.session.commit()
        
        # Get updated like count
        like_count = DiscussionLike.query.filter_by(discussion_id=discussion_id).count()
        
        return jsonify({
            'liked': liked,
            'like_count': like_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/discussions', methods=['POST'])
def create_discussion():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'content', 'category']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        discussion = Discussion()
        discussion.title = data['title']
        discussion.content = data['content']
        discussion.category = data['category']
        discussion.tags = ','.join(data.get('tags', []))
        discussion.user_id = user_id
        
        # Handle media upload
        if data.get('media_data') and data.get('media_type'):
            discussion.media_type = data['media_type']
            discussion.media_url = data['media_data']  # Store base64 data
            discussion.media_filename = data.get('media_filename', 'uploaded_file')
        
        db.session.add(discussion)
        db.session.commit()
        
        return jsonify({
            'message': 'Discussion created successfully',
            'discussion': discussion.to_dict(user_id)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/discussions/<int:discussion_id>', methods=['PUT'])
def update_discussion(discussion_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        discussion = Discussion.query.get_or_404(discussion_id)
        
        # Check if user owns the discussion
        if discussion.user_id != user_id:
            return jsonify({'error': 'Permission denied'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'content', 'category']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Update discussion fields
        discussion.title = data['title']
        discussion.content = data['content']
        discussion.category = data['category']
        discussion.tags = ','.join(data.get('tags', []))
        discussion.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Discussion updated successfully',
            'discussion': discussion.to_dict(user_id)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/discussions/<int:discussion_id>', methods=['DELETE'])
def delete_discussion(discussion_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        discussion = Discussion.query.get_or_404(discussion_id)
        
        # Check if user owns the discussion
        if discussion.user_id != user_id:
            return jsonify({'error': 'Permission denied'}), 403
        
        db.session.delete(discussion)
        db.session.commit()
        
        return jsonify({'message': 'Discussion deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/discussions/<int:discussion_id>', methods=['GET'])
def get_discussion(discussion_id):
    try:
        user_id = session.get('user_id')
        discussion = Discussion.query.get_or_404(discussion_id)
        
        return jsonify({
            'discussion': discussion.to_dict(user_id)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/api/discussions/<int:discussion_id>/replies', methods=['GET'])
def get_discussion_replies(discussion_id):
    try:
        user_id = session.get('user_id')
        # Only get top-level replies (parent_reply_id is None)
        replies = DiscussionReply.query.filter_by(discussion_id=discussion_id, parent_reply_id=None)\
                                     .order_by(desc(DiscussionReply.created_at)).all()
        return jsonify({
            'replies': [reply.to_dict(user_id) for reply in replies]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/discussions/<int:discussion_id>/replies', methods=['POST'])
def add_discussion_reply(discussion_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json()
        if not data.get('content'):
            return jsonify({'error': 'Content is required'}), 400
        
        reply = DiscussionReply()
        reply.content = data['content']
        reply.user_id = user_id
        reply.discussion_id = discussion_id
        
        db.session.add(reply)
        db.session.commit()
        
        # Create notification for discussion owner
        discussion = Discussion.query.get(discussion_id)
        replier = User.query.get(user_id)
        if discussion and replier and discussion.user_id != user_id:
            create_notification(
                user_id=discussion.user_id,
                type='reply',
                title='New Discussion Reply',
                message=f'{replier.full_name} replied to your discussion "{discussion.title}"',
                related_user_id=user_id,
                project_id=None
            )
        
        return jsonify({
            'message': 'Reply added successfully',
            'reply': reply.to_dict(user_id)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Reply reaction APIs
@app.route('/api/reply/<int:reply_id>/reaction', methods=['POST'])
def toggle_reply_reaction(reply_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json()
        reaction_type = data.get('reaction_type')
        
        if reaction_type not in ['like', 'heart']:
            return jsonify({'error': 'Invalid reaction type'}), 400
        
        reply = DiscussionReply.query.get_or_404(reply_id)
        
        # Check if user already reacted with this type
        existing_reaction = ReplyReaction.query.filter_by(
            user_id=user_id, 
            reply_id=reply_id, 
            reaction_type=reaction_type
        ).first()
        
        if existing_reaction:
            # Remove reaction
            db.session.delete(existing_reaction)
            user_reacted = False
            action = 'removed'
        else:
            # Add reaction
            reaction = ReplyReaction()
            reaction.user_id = user_id
            reaction.reply_id = reply_id
            reaction.reaction_type = reaction_type
            db.session.add(reaction)
            user_reacted = True
            action = 'added'
        
        db.session.commit()
        
        return jsonify({
            'message': f'Reaction {action} successfully',
            'count': reply.get_reaction_count(reaction_type),
            'user_reacted': user_reacted
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Discussion Reply Edit and Delete APIs
@app.route('/api/replies/<int:reply_id>', methods=['PUT'])
def update_discussion_reply(reply_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        reply = DiscussionReply.query.get_or_404(reply_id)
        
        # Check if user owns the reply
        if reply.user_id != user_id:
            return jsonify({'error': 'Permission denied'}), 403
        
        data = request.get_json()
        content = data.get('content', '').strip()
        
        if not content:
            return jsonify({'error': 'Reply content is required'}), 400
        
        reply.content = content
        reply.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Reply updated successfully',
            'reply': reply.to_dict(user_id)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/replies/<int:reply_id>', methods=['DELETE'])
def delete_discussion_reply(reply_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        reply = DiscussionReply.query.get_or_404(reply_id)
        
        # Check if user owns the reply
        if reply.user_id != user_id:
            return jsonify({'error': 'Permission denied'}), 403
        
        db.session.delete(reply)
        db.session.commit()
        
        return jsonify({'message': 'Reply deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Nested reply APIs
@app.route('/api/reply/<int:parent_reply_id>/replies', methods=['POST'])
def add_nested_reply(parent_reply_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json()
        if not data.get('content'):
            return jsonify({'error': 'Content is required'}), 400
        
        parent_reply = DiscussionReply.query.get_or_404(parent_reply_id)
        
        nested_reply = DiscussionReply()
        nested_reply.content = data['content']
        nested_reply.user_id = user_id
        nested_reply.discussion_id = parent_reply.discussion_id
        nested_reply.parent_reply_id = parent_reply_id
        
        db.session.add(nested_reply)
        db.session.commit()
        
        return jsonify({
            'message': 'Nested reply added successfully',
            'reply': nested_reply.to_dict(user_id)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/discussions/stats', methods=['GET'])
def get_discussion_stats():
    try:
        # Ideas shared count = number of discussion posts (total discussions)
        ideas_shared = Discussion.query.count()
        
        # Community members = unique users who have posted discussions
        community_members = db.session.query(Discussion.user_id).distinct().count()
        
        # Active discussions = total number of replies across all discussions
        active_discussions = DiscussionReply.query.count()
        
        return jsonify({
            'totalDiscussions': active_discussions,  # Active discussions (replies count)
            'activeMembers': community_members,       # Community members (unique posters)
            'ideasShared': ideas_shared              # Ideas shared (total discussion posts)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Discussion Comment API endpoints (renamed to avoid conflicts)
@app.route('/api/discussions/<int:discussion_id>/comments', methods=['GET'])
def get_discussion_comments(discussion_id):
    try:
        user_id = session.get('user_id')
        # Get top-level replies (comments) for this discussion
        comments = DiscussionReply.query.filter_by(discussion_id=discussion_id, parent_reply_id=None)\
                                      .order_by(DiscussionReply.created_at).all()
        return jsonify({
            'comments': [comment.to_dict(user_id) for comment in comments]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/discussions/<int:discussion_id>/comments', methods=['POST'])
def add_discussion_comment(discussion_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json()
        if not data.get('content'):
            return jsonify({'error': 'Content is required'}), 400
        
        comment = DiscussionReply()
        comment.content = data['content']
        comment.user_id = user_id
        comment.discussion_id = discussion_id
        # No parent_reply_id means it's a top-level comment
        
        db.session.add(comment)
        db.session.commit()
        
        return jsonify({
            'message': 'Comment added successfully',
            'comment': comment.to_dict(user_id)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/discussion-comments/<int:comment_id>', methods=['PUT'])
def update_discussion_comment(comment_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        comment = DiscussionReply.query.get_or_404(comment_id)
        
        # Check if user owns the comment
        if comment.user_id != user_id:
            return jsonify({'error': 'Permission denied'}), 403
        
        data = request.get_json()
        content = data.get('content', '').strip()
        
        if not content:
            return jsonify({'error': 'Comment content is required'}), 400
        
        comment.content = content
        comment.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Comment updated successfully',
            'comment': comment.to_dict(user_id)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/discussion-comments/<int:comment_id>', methods=['DELETE'])
def delete_discussion_comment(comment_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        comment = DiscussionReply.query.get_or_404(comment_id)
        
        # Check if user owns the comment
        if comment.user_id != user_id:
            return jsonify({'error': 'Permission denied'}), 403
        
        db.session.delete(comment)
        db.session.commit()
        
        return jsonify({'message': 'Comment deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/discussion-comments/<int:comment_id>/react', methods=['POST'])
def toggle_discussion_comment_reaction(comment_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json()
        reaction_type = data.get('reaction_type', 'like')
        
        comment = DiscussionReply.query.get_or_404(comment_id)
        
        # Check if user already reacted with this type
        existing_reaction = ReplyReaction.query.filter_by(
            user_id=user_id, 
            reply_id=comment_id, 
            reaction_type=reaction_type
        ).first()
        
        if existing_reaction:
            # Remove reaction
            db.session.delete(existing_reaction)
            user_reacted = False
        else:
            # Add reaction
            reaction = ReplyReaction()
            reaction.user_id = user_id
            reaction.reply_id = comment_id
            reaction.reaction_type = reaction_type
            db.session.add(reaction)
            user_reacted = True
        
        db.session.commit()
        
        return jsonify({
            'reacted': user_reacted,
            'reaction_count': comment.get_reaction_count(reaction_type)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/discussion-comments/<int:comment_id>/replies', methods=['POST'])
def add_discussion_comment_reply(comment_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json()
        if not data.get('content'):
            return jsonify({'error': 'Content is required'}), 400
        
        parent_comment = DiscussionReply.query.get_or_404(comment_id)
        
        reply = DiscussionReply()
        reply.content = data['content']
        reply.user_id = user_id
        reply.discussion_id = parent_comment.discussion_id
        reply.parent_reply_id = comment_id
        
        db.session.add(reply)
        db.session.commit()
        
        return jsonify({
            'message': 'Reply added successfully',
            'reply': reply.to_dict(user_id)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Profile API endpoints
@app.route('/api/profile', methods=['PUT'])
def update_profile():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update user fields
        if 'full_name' in data:
            user.full_name = data['full_name']
        if 'email' in data:
            # Check if email is already taken by another user
            existing_user = User.query.filter_by(email=data['email']).first()
            if existing_user and existing_user.id != user_id:
                return jsonify({'error': 'Email already taken'}), 400
            user.email = data['email']
        if 'college' in data:
            user.college = data['college']
        if 'bio' in data:
            user.bio = data['bio']
        if 'skills' in data:
            user.skills = data['skills']
        if 'profile_image' in data:
            user.profile_image = data['profile_image']
        if 'phone' in data:
            user.phone = data['phone']
        if 'location' in data:
            user.location = data['location']
        if 'title' in data:
            user.title = data['title']
        if 'twitter' in data:
            user.twitter = data['twitter']
        if 'linkedin' in data:
            user.linkedin = data['linkedin']
        if 'github' in data:
            user.github = data['github']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:user_id>/profile', methods=['GET'])
def get_user_profile(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user's projects
        user_projects = Project.query.filter_by(user_id=user_id).order_by(desc(Project.created_at)).all()
        
        # Get user stats
        total_funding = sum(project.current_funding for project in user_projects)
        total_votes = sum(project.get_vote_count() for project in user_projects)
        total_collaborations = Collaboration.query.filter_by(user_id=user_id).count()
        
        profile_data = user.to_dict()
        profile_data.update({
            'total_projects': len(user_projects),
            'total_funding': total_funding,
            'total_votes': total_votes,
            'total_collaborations': total_collaborations,
            'projects': [project.to_dict() for project in user_projects]
        })
        
        return jsonify({'profile': profile_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        search = request.args.get('search', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        query = User.query
        
        if search:
            query = query.filter(
                User.full_name.contains(search) |
                User.username.contains(search) |
                User.college.contains(search)
            )
        
        # Paginate results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        users = [user.to_dict() for user in paginated.items]
        
        return jsonify({
            'users': users,
            'total': paginated.total,
            'pages': paginated.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/user-collaborations', methods=['GET'])
def get_user_collaborations_sent():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get collaborations requested by the user
        collaborations = db.session.query(
            Collaboration,
            Project.title.label('project_title'),
            User.full_name.label('owner_name')
        ).join(
            Project, Collaboration.project_id == Project.id
        ).join(
            User, Project.user_id == User.id
        ).filter(
            Collaboration.user_id == user_id
        ).all()
        
        collab_list = []
        for collab, project_title, owner_name in collaborations:
            collab_dict = {
                'id': collab.id,
                'message': collab.message,
                'status': collab.status,
                'created_at': collab.created_at.isoformat(),
                'project_title': project_title,
                'owner_name': owner_name
            }
            collab_list.append(collab_dict)
        
        return jsonify({
            'collaborations': collab_list
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/user-donations', methods=['GET'])
def get_user_donations():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get donations made by the user
        donations = db.session.query(
            Donation,
            Project.title.label('project_title'),
            User.full_name.label('owner_name')
        ).join(
            Project, Donation.project_id == Project.id
        ).join(
            User, Project.user_id == User.id
        ).filter(
            Donation.user_id == user_id
        ).order_by(desc(Donation.created_at)).all()
        
        donations_list = []
        for donation, project_title, owner_name in donations:
            donation_dict = {
                'id': donation.id,
                'amount': donation.amount,
                'message': donation.message,
                'created_at': donation.created_at.isoformat(),
                'project_title': project_title,
                'owner_name': owner_name
            }
            donations_list.append(donation_dict)
        
        return jsonify({
            'donations': donations_list
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/user-activity', methods=['GET'])
def get_user_activity():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        activities = []
        
        # Recent projects created
        recent_projects = Project.query.filter_by(user_id=user_id)\
            .order_by(desc(Project.created_at)).limit(5).all()
        
        for project in recent_projects:
            activities.append({
                'type': 'project_created',
                'text': f'Created new project "{project.title}"',
                'time': project.created_at.isoformat(),
                'project_id': project.id
            })
        
        # Recent collaborations
        recent_collabs = db.session.query(
            Collaboration, Project.title
        ).join(
            Project, Collaboration.project_id == Project.id
        ).filter(
            Collaboration.user_id == user_id
        ).order_by(desc(Collaboration.created_at)).limit(5).all()
        
        for collab, project_title in recent_collabs:
            activities.append({
                'type': 'collaboration',
                'text': f'Requested collaboration on "{project_title}"',
                'time': collab.created_at.isoformat(),
                'status': collab.status
            })
        
        # Recent donations
        recent_donations = db.session.query(
            Donation, Project.title
        ).join(
            Project, Donation.project_id == Project.id
        ).filter(
            Donation.user_id == user_id
        ).order_by(desc(Donation.created_at)).limit(5).all()
        
        for donation, project_title in recent_donations:
            activities.append({
                'type': 'donation',
                'text': f'Donated ${donation.amount:.2f} to "{project_title}"',
                'time': donation.created_at.isoformat(),
                'amount': donation.amount
            })
        
        # Recent votes
        recent_votes = db.session.query(
            Vote, Project.title
        ).join(
            Project, Vote.project_id == Project.id
        ).filter(
            Vote.user_id == user_id,
            Vote.is_upvote == True
        ).order_by(desc(Vote.created_at)).limit(5).all()
        
        for vote, project_title in recent_votes:
            activities.append({
                'type': 'vote',
                'text': f'Voted for "{project_title}"',
                'time': vote.created_at.isoformat()
            })
        
        # Recent comments
        recent_comments = db.session.query(
            Comment, Project.title
        ).join(
            Project, Comment.project_id == Project.id
        ).filter(
            Comment.user_id == user_id
        ).order_by(desc(Comment.created_at)).limit(5).all()
        
        for comment, project_title in recent_comments:
            activities.append({
                'type': 'comment',
                'text': f'Commented on "{project_title}"',
                'time': comment.created_at.isoformat()
            })
        
        # Sort all activities by time (newest first)
        activities.sort(key=lambda x: x['time'], reverse=True)
        
        # Return only the 10 most recent activities
        return jsonify({
            'activities': activities[:10]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Collaboration management for dashboard
@app.route('/api/collaborations', methods=['GET'])
def get_user_collaborations():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get collaborations for projects owned by the user with user and project details
        collaborations = db.session.query(
            Collaboration,
            Project.title.label('project_title'),
            User.full_name.label('requester_name'),
            User.username.label('requester_username'),
            User.email.label('requester_email')
        ).join(
            Project, Collaboration.project_id == Project.id
        ).join(
            User, Collaboration.user_id == User.id
        ).filter(
            Project.user_id == user_id
        ).order_by(desc(Collaboration.created_at)).all()
        
        collab_list = []
        for collab, project_title, requester_name, requester_username, requester_email in collaborations:
            collab_dict = {
                'id': collab.id,
                'message': collab.message,
                'status': collab.status,
                'created_at': collab.created_at.isoformat(),
                'project': {
                    'title': project_title
                },
                'requester': {
                    'full_name': requester_name,
                    'username': requester_username,
                    'email': requester_email
                }
            }
            collab_list.append(collab_dict)
        
        return jsonify({
            'collaborations': collab_list
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/collaborations/<int:collab_id>/accept', methods=['POST'])
def accept_collaboration(collab_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        collaboration = Collaboration.query.get_or_404(collab_id)
        
        # Check if user owns the project
        if collaboration.project.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        collaboration.status = 'accepted'
        db.session.commit()
        
        # Create notification for the collaborator
        requester = User.query.get(collaboration.user_id)
        project = Project.query.get(collaboration.project_id)
        if requester and project:
            create_notification(
                user_id=collaboration.user_id,
                type='collaboration',
                title='Collaboration Accepted',
                message=f'Your collaboration request for "{project.title}" has been accepted!',
                related_user_id=user_id,
                project_id=project.id
            )
        
        return jsonify({
            'message': 'Collaboration request accepted',
            'collaboration': collaboration.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/collaborations/<int:collab_id>/reject', methods=['POST'])
def reject_collaboration(collab_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        collaboration = Collaboration.query.get_or_404(collab_id)
        
        # Check if user owns the project
        if collaboration.project.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        collaboration.status = 'rejected'
        db.session.commit()
        
        return jsonify({
            'message': 'Collaboration request rejected',
            'collaboration': collaboration.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Notification APIs for dashboard
@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get notifications from database
        notifications = Notification.query.filter_by(user_id=user_id)\
            .order_by(desc(Notification.created_at))\
            .limit(50).all()
        
        # Count unread notifications
        unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
        
        return jsonify({
            'notifications': [n.to_dict() for n in notifications],
            'unread_count': unread_count
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/count', methods=['GET'])
def get_notification_count():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Count unread notifications from database
        count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
        
        return jsonify({'unread_count': min(count, 99)}), 200  # Cap at 99
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/<int:notification_id>/read', methods=['POST'])
def mark_notification_read(notification_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Find and mark notification as read
        notification = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
        if notification:
            notification.is_read = True
            db.session.commit()
        
        return jsonify({'message': 'Notification marked as read'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/mark-all-read', methods=['POST'])
def mark_all_notifications_read():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Mark all notifications as read for this user
        Notification.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})
        db.session.commit()
        
        return jsonify({'message': 'All notifications marked as read'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/clear-all', methods=['DELETE'])
def clear_all_notifications():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Delete all notifications for this user
        Notification.query.filter_by(user_id=user_id).delete()
        db.session.commit()
        
        return jsonify({'message': 'All notifications cleared'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Homepage stats API with accurate donation totals
@app.route('/api/homepage/stats', methods=['GET'])
def get_homepage_stats():
    try:
        total_projects = Project.query.count()
        total_users = User.query.count()
        # Total funding = sum of all project funding goals (what users set as their goals)
        total_funding = db.session.query(func.sum(Project.funding_goal)).scalar() or 0
        
        return jsonify({
            'totalProjects': total_projects,
            'totalUsers': total_users,
            'totalFunding': total_funding
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get user's team members (accepted collaborations)
@app.route('/api/user/team', methods=['GET'])
def get_user_team():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get all projects owned by the user
        owned_projects = Project.query.filter_by(user_id=user_id).all()
        
        # Get all accepted collaborations for these projects
        team_members = []
        for project in owned_projects:
            collaborations = Collaboration.query.filter_by(
                project_id=project.id,
                status='accepted'
            ).all()
            
            for collab in collaborations:
                team_member = {
                    'project_id': project.id,
                    'project_title': project.title,
                    'user': collab.collaborator.to_dict(),
                    'collaboration_date': collab.created_at.isoformat()
                }
                team_members.append(team_member)
        
        # Also get projects where current user is a collaborator
        user_collaborations = Collaboration.query.filter_by(
            user_id=user_id,
            status='accepted'
        ).all()
        
        for collab in user_collaborations:
            team_member = {
                'project_id': collab.project.id,
                'project_title': collab.project.title,
                'user': collab.project.owner.to_dict(),
                'collaboration_date': collab.created_at.isoformat(),
                'is_owner': True
            }
            team_members.append(team_member)
        
        return jsonify({'team_members': team_members}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Team Chat APIs
@app.route('/api/projects/<int:project_id>/chat', methods=['GET'])
def get_project_chat(project_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Check if user has access to this project (owner or collaborator)
        project = Project.query.get_or_404(project_id)
        is_owner = project.user_id == user_id
        is_collaborator = Collaboration.query.filter_by(
            project_id=project_id,
            user_id=user_id,
            status='accepted'
        ).first() is not None
        
        if not (is_owner or is_collaborator):
            return jsonify({'error': 'Access denied'}), 403
        
        # Get chat messages for this project
        messages = TeamChat.query.filter_by(project_id=project_id)\
            .order_by(TeamChat.created_at.asc()).all()
        
        return jsonify({
            'messages': [msg.to_dict() for msg in messages],
            'project': project.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>/chat', methods=['POST'])
def send_chat_message(project_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json()
        if not data.get('message'):
            return jsonify({'error': 'Message is required'}), 400
        
        # Check if user has access to this project (owner or collaborator)
        project = Project.query.get_or_404(project_id)
        is_owner = project.user_id == user_id
        is_collaborator = Collaboration.query.filter_by(
            project_id=project_id,
            user_id=user_id,
            status='accepted'
        ).first() is not None
        
        if not (is_owner or is_collaborator):
            return jsonify({'error': 'Access denied'}), 403
        
        # Create new chat message
        chat_message = TeamChat()
        chat_message.project_id = project_id
        chat_message.user_id = user_id
        chat_message.message = data['message']
        
        db.session.add(chat_message)
        db.session.commit()
        
        # Get current user for notification
        sender = User.query.get(user_id)
        
        # Get all team members (owner + collaborators) except the sender
        team_members = []
        
        # Add project owner if not the sender
        if project.user_id != user_id:
            team_members.append(project.user_id)
        
        # Add accepted collaborators who aren't the sender
        collaborators = Collaboration.query.filter_by(
            project_id=project_id,
            status='accepted'
        ).filter(Collaboration.user_id != user_id).all()
        
        for collab in collaborators:
            team_members.append(collab.user_id)
        
        # Create notifications for all team members
        for member_id in team_members:
            create_notification(
                user_id=member_id,
                type='team_chat',
                title='New Team Message',
                message=f'{sender.username} sent a message in {project.title}',
                related_user_id=user_id,
                project_id=project_id
            )
        
        return jsonify({
            'message': 'Message sent successfully',
            'chat_message': chat_message.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>/participants', methods=['GET'])
def get_project_participants(project_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Check if user has access to this project (owner or collaborator)
        project = Project.query.get_or_404(project_id)
        is_owner = project.user_id == user_id
        is_collaborator = Collaboration.query.filter_by(
            project_id=project_id,
            user_id=user_id,
            status='accepted'
        ).first() is not None
        
        if not (is_owner or is_collaborator):
            return jsonify({'error': 'Access denied'}), 403
        
        # Get all participants (owner + accepted collaborators)
        participants = []
        
        # Add project owner
        owner = User.query.get(project.user_id)
        if owner:
            participants.append({
                'user': owner.to_dict(),
                'is_owner': True,
                'joined_at': project.created_at.isoformat() if project.created_at else None
            })
        
        # Add accepted collaborators
        collaborators = Collaboration.query.filter_by(
            project_id=project_id,
            status='accepted'
        ).join(User).all()
        
        for collab in collaborators:
            participants.append({
                'user': collab.user.to_dict(),
                'is_owner': False,
                'joined_at': collab.created_at.isoformat() if collab.created_at else None
            })
        
        return jsonify({
            'participants': participants,
            'project': project.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        
        user_id = session['user_id']
        
        # Get accepted collaborations where user is either requester or project owner
        accepted_collabs = db.session.query(Collaboration).join(Project).join(User, User.id == Project.owner_id).filter(
            ((Collaboration.user_id == user_id) | (Project.owner_id == user_id)) &
            (Collaboration.status == 'accepted')
        ).all()
        
        team_members = set()
        
        for collab in accepted_collabs:
            if collab.user_id == user_id:
                # User is the collaborator, add project owner to team
                owner = User.query.get(collab.project.owner_id)
                if owner:
                    team_members.add(owner)
            else:
                # User is the project owner, add collaborator to team
                collaborator = User.query.get(collab.user_id)
                if collaborator:
                    team_members.add(collaborator)
        
        team_data = [{
            'id': member.id,
            'username': member.username,
            'full_name': member.full_name,
            'email': member.email,
            'college': member.college
        } for member in team_members]
        
        return jsonify({'team_members': team_data}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Project details API
@app.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project_details(project_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get project with owner information
        project = db.session.query(Project).filter_by(id=project_id).first()
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        # Check if user owns this project or has access
        if project.user_id != user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get additional stats
        vote_count = Vote.query.filter_by(project_id=project_id, is_upvote=True).count()
        comment_count = Comment.query.filter_by(project_id=project_id).count()
        collaboration_count = Collaboration.query.filter_by(project_id=project_id, status='accepted').count()
        current_funding = db.session.query(func.sum(Donation.amount)).filter_by(project_id=project_id).scalar() or 0
        
        project_data = {
            'id': project.id,
            'title': project.title,
            'description': project.description,
            'category': project.category,
            'status': project.status,
            'funding_goal': project.funding_goal,
            'current_funding': current_funding,
            'created_at': project.created_at.isoformat(),
            'vote_count': vote_count,
            'comment_count': comment_count,
            'collaboration_count': collaboration_count
        }
        
        return jsonify({'project': project_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Browse page statistics API
@app.route('/api/stats', methods=['GET'])
def get_browse_stats():
    try:
        # Get total number of projects
        total_projects = Project.query.count()
        
        # Get total funding raised (sum of all donations)
        total_funding = db.session.query(func.sum(Donation.amount)).scalar() or 0
        
        # Get total number of unique collaborators (users who have accepted collaborations)
        total_collaborators = db.session.query(Collaboration.user_id).filter_by(status='accepted').distinct().count()
        
        return jsonify({
            'total_projects': total_projects,
            'total_funding': total_funding,
            'total_collaborators': total_collaborators
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


