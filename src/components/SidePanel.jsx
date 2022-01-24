import { isMobile } from 'react-device-detect';
import twitter from "../images/twitter-black-icon.png"
import github from "../images/github-black-icon.png"
import medium from "../images/medium-black-icon.png"
import email from "../images/email-icon.png"
import discord from "../images/discord-black-icon.png"
import telegram from "../images/telegram-black-icon.png"

import logo from '../images/logo.png'
import ftmlogo from '../images/ftmlogo.png'

import WalletSpace from './WalletSpace'

const orange = '#ec7019'

let trimDec = (n, dec) => {
    let ar = n.toString().split('.')
    if (ar.length === 1) return ar[0]
    ar[1] = ar[1].substr(0, dec)
    return ar.join('.')
}

const Icon = (props) => {
    return (
        <a href={props.href} style={{
            textDecoration: 'none',
            width: 70,
            padding: 10,
            textAlign: 'center',
            display: 'inline-block'
        }} target="_blank" rel="noreferrer"><img style={{
            verticalAlign: 'top',
            margin: 13
        }}
            src={props.src} alt={props.alt} href={props.href} height={22} /></a>
    )
}

const Link = (props) => {
    let style = {
        border: 'none',
        color: orange,
        fontSize: 17,
        backgroundColor: 'transparent',
        display: 'block',
        marginTop: 25
    }
    if (props.page === props.current) {
        style.fontWeight = 'bold'
    }
    return (
        <a style={style} href={props.page}>{props.children}</a>
    )
}

const SubLink = (props) => {
    let style = {
        border: 'none',
        color: 'white',
        fontSize: 14,
        marginLeft: 10,
        backgroundColor: 'transparent',
        display: 'block',
        marginTop: 10
    }
    if (props.page === props.current) {
        style.fontWeight = 'bold'
    }
    return (
        <button style={style} onClick={() => props.gotoPage(props.page)}>{props.children}</button>
    )
}

const Logo = (props) => {
    return (
        <a style={{
            padding: 20, width: "100%", marginLeft: '20px', marginRight: 'auto',
            textAlign: 'center', textDecoration: 'none', display: 'flex'
        }} href="https://elyseos.com" target="_blank" rel="noreferrer">
            <img src={logo} width={70} alt="logo" />
            <div style={{
                display: 'inline-block',
                fontSize: 24,
                fontWeight: 'normal',
                color: '#000000',
                verticalAlign: 'top',
                marginTop: 20,
                marginLeft: 10
            }}>
                ELYS Token
            </div>
        </a>
    )
}

const Price = (props) => {
    return <div style={{
        width: 200,
        display: 'flex',
        marginRight: 'auto',
        marginLeft: 'auto',
        borderTop: 'solid 2px' + orange,
        borderBottom: 'solid 2px' + orange,
        color: '#000000',
        fontSize: 17,
        fontWeight: 'normal',
        padding: 10,
        textAlign: 'center',
        textDecoration: 'none'
    }}>
        <img src={logo} width={30} alt="ElysLogo" />
        <div style={{ display: 'inline-block', marginLeft: 10, verticalAlign: 'top', marginTop: 5 }}>
            <a style={{ textDecoration: 'none', color: '#000000' }} href="https://kek.tools/t/0xd89cc0d2a28a769eadef50fff74ebc07405db9fc" target="_blank" rel="noreferrer">${trimDec(props.price.usd, 2)}</a>
        </div>
        <div style={{ display: 'inline-block', marginLeft: 10, verticalAlign: 'top', marginTop: 5 }}>
            =
        </div>
        <img src={ftmlogo} alt="FTMLogo" width={16} style={{ position: 'relative', top: -2, marginLeft: 10 }} />
        <div style={{ display: 'inline-block', marginLeft: 10, verticalAlign: 'top', marginTop: 5 }}>
            <a style={{ textDecoration: 'none', color: '#000000' }} href="https://charts.zoocoin.cash/charts?exchange=ZooDex&pair=0x6831b2EDe25Dcc957256FAE815f051181F6C7b08-inverted" target="_blank" rel="noreferrer">{trimDec(props.price.ftm, 2)}</a>
        </div>


    </div>
}


const SidePanel = (props) => {
    console.log(props)
    let style = {
        display: 'inline-block',
        backgroundColor: '#facbac',
        flex: '0 0 280px',
        position: (isMobile) ? 'fixed' : 'relative',
        left: (isMobile) ? (props.hidden) ? -300 : 0 : 0,
        transition: '0.5s',
        top: 0,
        bottom: 0,
        verticalAlign: 'top',
        zIndex: '90',
        borderRight: 'solid 2px ' + orange
    }

    /*
    <Link current={props.page} gotoPage={props.gotoPage} page={'plugins'}>Plugins & Tools</Link>
    <Link current={props.page} gotoPage={props.gotoPage} page={'farm'}>Permaculture Farm</Link>
    */
    let sub = null;
    if (props.page == 'plugins' || props.page == 'pay') {
        sub = (<SubLink current={props.page} gotoPage={props.gotoPage} page={'pay'}>ELYS Pay Button</SubLink>)

    }
    return (
        <div style={style} onClick={props.click}>
            <Logo />
            <Price price={props.price} connected={props.connected} />
            <div style={{ width: "fit-content", margin: "40px auto" }}>
                <WalletSpace />
            </div>

            <div style={{
                width: 230,
                marginLeft: 'auto',
                marginRight: 'auto',
                marginTop: 0,
                display: 'block'
            }}>
                <Link page="https://elys.money">Back to elys.money</Link>
                <Link page="#elysBridge">Bridge ELYS</Link>
                <Link page="#btcBridge">Bridge Bitcoin</Link>
                <Link page="#">Bridge Guide</Link>
            </div>
            <div style={{
                display: 'inline-block',
                right: 0,
                width: '100%',
                marginTop: 0,
                textAlign: 'center',
                position: 'absolute',
                bottom: 20
            }}>
                <Icon src={twitter} alt="twitter" href="https://twitter.com/ElyseosFDN" />
                <Icon src={telegram} alt="telegram" href="https://t.me/joinchat/kJCUkY1WacpkZTVk" />
                <Icon src={github} alt="github" href="https://github.com/elyseos/contracts" />
                <Icon src={medium} alt="medium" href="https://medium.com/@Elyseos" />
                <Icon src={email} alt="email" href="https://www.elyseos.com/email-signup" />
                <Icon src={discord} alt="discord" href="https://discord.gg/gY2WMAnBem" />
            </div>
        </div>
    )
}

export default SidePanel
