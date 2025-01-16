import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'antd';
import { 
  LaptopOutlined, 
  DeploymentUnitOutlined, 
  LogoutOutlined, 
  MenuUnfoldOutlined, 
  MenuFoldOutlined, 
  RobotOutlined,
  HomeOutlined,
  BarChartOutlined,
  WarningOutlined ,
  FormOutlined ,
  PieChartOutlined
  
} from '@ant-design/icons';

const SideMenu = ({ collapsed, onCollapse, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);

  const toggleCollapsed = () => {
    onCollapse(!collapsed);
  };

  const menuItems = [
    {
      label: 'Home',
      key: '/',
      icon: <HomeOutlined />,
      color: '#0DB39E'
    },
    {
      label: 'Robots',
      key: '/devices',
      icon: <LaptopOutlined />,
      color: '#0DB39E'
    },
    {
      label: 'Scheduler',
      key: '/multicast',
      icon: <DeploymentUnitOutlined />,
      color: '#0DB39E'
    },
    {
      label: 'Robot Status',
      key: '/robotStatus',
      icon: <RobotOutlined />,
      color: '#0DB39E'
    },
    {
      label: 'Configuration',
      key: '/configuration',
      icon: <FormOutlined />,
      color: '#0DB39E'
    },
    {
      label: 'Fault Log',
      key: '/robotErrors',
      icon: <WarningOutlined />,
      color: '#0DB39E'
    },
    {
      label: 'Availability',
      key: '/avalability',
      icon: <PieChartOutlined />,
      color: '#0DB39E'
    },
    {
      label: 'Reports',
      key: '/reports',
      icon: <BarChartOutlined />,
      color: '#0DB39E'
    },
    {
      label: 'Logout',
      key: 'logout',
      icon: <LogoutOutlined />,
      onClick: onLogout
    },
  ];

  const handleMenuClick = (item) => {
    if (item.key !== 'logout') {
      navigate(item.key);
    }
  };

  return (
    <div 
      className="side-menu-container" 
      style={{ 
        width: collapsed ? '80px' : '250px', 
        backgroundColor: '#F5F5F5', 
        height: '100%', 
        transition: 'width 0.3s ease',
        boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* Toggle Collapse Button */}
      <div 
        className="menu-toggle"
        onClick={toggleCollapsed}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          padding: '8px',
          cursor: 'pointer',
          backgroundColor: 'transparent',
          border: 'none',
          zIndex: 1,
        }}
        aria-label={collapsed ? "Expand menu" : "Collapse menu"}
      >
        {collapsed ? <MenuUnfoldOutlined style={{ fontSize: '24px' }} /> : <MenuFoldOutlined style={{ fontSize: '24px' }} />}
      </div>
      
      {/* Menu */}
      <Menu
        mode="inline"
        inlineCollapsed={collapsed}
        onClick={handleMenuClick}
        style={{ 
          marginTop: '50px',
          backgroundColor: 'transparent', 
          border: 'none', 
          flex: 1 
        }}
      >
        {menuItems.map((item) => (
          <Menu.Item 
            key={item.key}
            style={{
              margin: '8px 16px',
              borderRadius: '8px',
              transition: 'all 0.3s ease',
              backgroundColor: location.pathname === item.key 
                ? item.color 
                : (hoveredItem === item.key 
                  ? 'rgba(13, 179, 158, 0.1)' 
                  : 'transparent'),
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '10px 16px',
            }}
            onMouseEnter={() => setHoveredItem(item.key)}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={item.onClick || (() => {})}
          >
            {React.cloneElement(item.icon, {
              style: {
                color: location.pathname === item.key
                  ? 'white'
                  : (hoveredItem === item.key 
                    ? '#0DB39E' 
                    : '#8C8C8C'),
                fontSize: '18px',
                marginRight: collapsed ? '0' : '12px',
                transition: 'color 0.3s ease'
              }
            })}
            {!collapsed && (
              <span 
                style={{
                  color: location.pathname === item.key 
                    ? 'white' 
                    : 'black',
                  fontWeight: location.pathname === item.key 
                    ? 'bold' 
                    : 'normal'
                }}
              >
                {item.label}
              </span>
            )}
          </Menu.Item>
        ))}
      </Menu>
    </div>
  );
};

export default SideMenu;