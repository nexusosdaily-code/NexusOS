import os
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

Base = declarative_base()

class SimulationConfig(Base):
    __tablename__ = 'simulation_configs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    alpha = Column(Float, nullable=False)
    beta = Column(Float, nullable=False)
    kappa = Column(Float, nullable=False)
    eta = Column(Float, nullable=False)
    
    w_H = Column(Float, nullable=False)
    w_M = Column(Float, nullable=False)
    w_D = Column(Float, nullable=False)
    w_E = Column(Float, nullable=False)
    
    gamma_C = Column(Float, nullable=False)
    gamma_D = Column(Float, nullable=False)
    gamma_E = Column(Float, nullable=False)
    
    K_p = Column(Float, nullable=False)
    K_i = Column(Float, nullable=False)
    K_d = Column(Float, nullable=False)
    
    N_target = Column(Float, nullable=False)
    N_initial = Column(Float, nullable=False)
    F_floor = Column(Float, nullable=False)
    
    lambda_E = Column(Float, nullable=False)
    lambda_N = Column(Float, nullable=False)
    lambda_H = Column(Float, nullable=False)
    lambda_M = Column(Float, nullable=False)
    
    N_0 = Column(Float, nullable=False)
    H_0 = Column(Float, nullable=False)
    M_0 = Column(Float, nullable=False)
    
    delta_t = Column(Float, nullable=False)
    num_steps = Column(Integer, nullable=False)
    
    signal_config = Column(JSON, nullable=True)

class SimulationRun(Base):
    __tablename__ = 'simulation_runs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    config_id = Column(Integer, nullable=False)
    run_at = Column(DateTime, default=datetime.utcnow)
    
    time_series = Column(JSON, nullable=False)
    
    final_N = Column(Float, nullable=True)
    avg_issuance = Column(Float, nullable=True)
    avg_burn = Column(Float, nullable=True)
    conservation_error = Column(Float, nullable=True)

class OptimizationRun(Base):
    __tablename__ = 'optimization_runs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    name = Column(String(255), nullable=False)
    
    objective_type = Column(String(50), nullable=False)
    objective_weights = Column(JSON, nullable=True)
    
    parameters_optimized = Column(JSON, nullable=False)
    parameter_bounds = Column(JSON, nullable=False)
    
    n_iterations = Column(Integer, nullable=False)
    best_params = Column(JSON, nullable=True)
    best_score = Column(Float, nullable=True)
    
    convergence_history = Column(JSON, nullable=True)
    completed_at = Column(DateTime, nullable=True)

class OptimizationIteration(Base):
    __tablename__ = 'optimization_iterations'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    optimization_id = Column(Integer, nullable=False)
    iteration_num = Column(Integer, nullable=False)
    
    parameters = Column(JSON, nullable=False)
    score = Column(Float, nullable=False)
    simulation_id = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

def get_engine():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL environment variable not set")
    
    return create_engine(
        database_url,
        echo=False,
        pool_pre_ping=True,
        pool_recycle=3600,
        connect_args={
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000'
        }
    )

def init_db():
    try:
        engine = get_engine()
        Base.metadata.create_all(engine)
        return engine
    except Exception as e:
        print(f"Warning: Database initialization failed: {e}")
        print("App will continue without database persistence")
        return None

def get_session():
    try:
        engine = get_engine()
        Session = sessionmaker(bind=engine)
        return Session()
    except Exception as e:
        print(f"Warning: Could not create database session: {e}")
        return None
